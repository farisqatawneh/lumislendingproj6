import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getForthAccessToken(clientId: string, clientSecret: string) {
  const tokenResponse = await fetch("https://api.forthcrm.com/v1/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const tokenResult = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) {
    throw new Error(
      `Failed to get Forth token (${tokenResponse.status}): ${JSON.stringify(tokenResult)}`
    );
  }

  const directToken =
    tokenResult?.access_token ??
    tokenResult?.token ??
    tokenResult?.api_key ??
    tokenResult?.apiKey ??
    tokenResult?.data?.access_token ??
    tokenResult?.data?.token ??
    tokenResult?.data?.api_key ??
    tokenResult?.data?.apiKey;

  const extractTokenFromObject = (value: unknown, depth = 0): string | null => {
    if (depth > 4 || !value || typeof value !== "object" || Array.isArray(value)) return null;
    const obj = value as Record<string, unknown>;

    for (const [key, entry] of Object.entries(obj)) {
      if (
        typeof entry === "string" &&
        /(access.?token|api.?key|token)/i.test(key) &&
        entry.trim().length > 10
      ) {
        return entry;
      }
    }

    for (const entry of Object.values(obj)) {
      const nested = extractTokenFromObject(entry, depth + 1);
      if (nested) return nested;
    }

    return null;
  };

  const token = typeof directToken === "string" ? directToken : extractTokenFromObject(tokenResult);

  if (!token || typeof token !== "string") {
    const topLevelKeys =
      tokenResult && typeof tokenResult === "object" && !Array.isArray(tokenResult)
        ? Object.keys(tokenResult as Record<string, unknown>).join(", ")
        : "non-object response";
    throw new Error(
      `Forth auth succeeded but no access token was returned. Top-level keys: ${topLevelKeys}`
    );
  }

  return token;
}

async function fetchForthContact(clientId: string, apiKey: string) {
  const response = await fetch(`https://api.forthcrm.com/v1/contacts/${clientId}`, {
    method: "GET",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  const result = await response.json().catch(() => ({}));
  return { response, result };
}

function getNested(value: unknown, path: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, value);
}

function pickFirstString(source: unknown, paths: string[], fallback = ""): string {
  for (const path of paths) {
    const value = getNested(source, path);
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return fallback;
}

function pickFirstNumber(source: unknown, paths: string[], fallback = 0): number {
  for (const path of paths) {
    const value = getNested(source, path);
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { client_id } = await req.json();
    const forthClientId = Deno.env.get("FORTH_CLIENT_ID");
    const forthClientSecret = Deno.env.get("FORTH_CLIENT_SECRET");

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!forthClientId || !forthClientSecret) {
      return new Response(
        JSON.stringify({ error: "FORTH_CLIENT_ID and FORTH_CLIENT_SECRET secrets must be configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const forthApiKey = await getForthAccessToken(forthClientId, forthClientSecret);

    let requestedClientId = String(client_id);
    let { response: forthResponse, result: forthResult } = await fetchForthContact(
      requestedClientId,
      forthApiKey
    );

    if (!forthResponse.ok && forthResponse.status === 404 && !requestedClientId.startsWith("FCDR")) {
      requestedClientId = `FCDR${requestedClientId}`;
      ({ response: forthResponse, result: forthResult } = await fetchForthContact(
        requestedClientId,
        forthApiKey
      ));
    }

    if (!forthResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `Forth CRM request failed (${forthResponse.status})`,
          details: forthResult,
        }),
        {
          status: forthResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Forth may return payload in multiple envelope shapes.
    const contact =
      forthResult?.response?.contact ??
      forthResult?.response?.client ??
      forthResult?.response ??
      forthResult?.data?.contact ??
      forthResult?.data?.client ??
      forthResult?.contact ??
      forthResult?.client ??
      forthResult?.data ??
      forthResult;

    const emailFromArray = Array.isArray(getNested(contact, "emails"))
      ? (getNested(contact, "emails") as unknown[])
          .map((item) =>
            typeof item === "string"
              ? item
              : pickFirstString(item, ["email", "value", "address"], "")
          )
          .find((value) => typeof value === "string" && value.trim().length > 0) ?? ""
      : "";

    const phoneFromArray = Array.isArray(getNested(contact, "phones"))
      ? (getNested(contact, "phones") as unknown[])
          .map((item) =>
            typeof item === "string"
              ? item
              : pickFirstString(item, ["phone", "value", "number"], "")
          )
          .find((value) => typeof value === "string" && value.trim().length > 0) ?? ""
      : "";

    const normalizedData = {
      client_id: pickFirstString(contact, ["id", "client_id", "contact_id"], requestedClientId),
      client_name:
        pickFirstString(contact, ["full_name", "client_name", "name"]) ||
        [pickFirstString(contact, ["first_name", "firstName"]), pickFirstString(contact, ["last_name", "lastName"])]
          .filter(Boolean)
          .join(" "),
      client_email: pickFirstString(contact, ["email", "client_email", "primary_email"], emailFromArray),
      client_phone: pickFirstString(
        contact,
        ["phone", "phone_number", "mobile_phone", "mobile", "cell_phone", "work_phone"],
        phoneFromArray
      ),
      ssn: pickFirstString(contact, ["ssn", "social_security_number", "custom_fields.ssn"]),
      date_of_birth: pickFirstString(contact, ["date_of_birth", "dob", "birth_date", "custom_fields.date_of_birth"]),
      street_address: pickFirstString(
        contact,
        ["street_address", "address.street", "address.address1", "address_line_1", "mailing_address.street"]
      ),
      city: pickFirstString(contact, ["city", "address.city", "mailing_address.city"]),
      state: pickFirstString(contact, ["state", "address.state", "mailing_address.state"]),
      zip: pickFirstString(contact, ["zip", "postal_code", "address.zip", "address.postal_code", "mailing_address.zip"]),
      credit_score: pickFirstNumber(contact, ["credit_score", "fico", "custom_fields.credit_score"]),
      credit_tier: pickFirstString(contact, ["credit_tier", "custom_fields.credit_tier"]),
      overall_credit_utilization: pickFirstNumber(
        contact,
        ["overall_credit_utilization", "credit_utilization", "custom_fields.overall_credit_utilization"]
      ),
      debt_to_income_ratio: pickFirstNumber(
        contact,
        ["debt_to_income_ratio", "dti", "custom_fields.debt_to_income_ratio"]
      ),
      own_estimated_term: pickFirstString(contact, ["own_estimated_term", "custom_fields.own_estimated_term"]),
      own_estimated_total_payoff: pickFirstNumber(
        contact,
        ["own_estimated_total_payoff", "custom_fields.own_estimated_total_payoff"]
      ),
      own_estimated_savings: pickFirstNumber(contact, ["own_estimated_savings", "custom_fields.own_estimated_savings"]),
      program_estimated_term: pickFirstString(contact, ["program_estimated_term", "custom_fields.program_estimated_term"]),
      program_estimated_total_payoff: pickFirstNumber(
        contact,
        ["program_estimated_total_payoff", "custom_fields.program_estimated_total_payoff"]
      ),
      program_monthly_payment: pickFirstNumber(contact, ["program_monthly_payment", "custom_fields.program_monthly_payment"]),
      debt_items: Array.isArray(contact?.debt_items)
        ? contact.debt_items.map((item: Record<string, unknown>) => ({
            creditor: String(item?.creditor ?? item?.name ?? ""),
            account_type: String(item?.account_type ?? item?.type ?? ""),
            balance: pickFirstNumber(item, ["balance"]),
            apr: pickFirstNumber(item, ["apr"]),
            utilization: pickFirstNumber(item, ["utilization"]),
            minimum_payment: pickFirstNumber(item, ["minimum_payment"]),
            est_interest_paid: pickFirstNumber(item, ["est_interest_paid"]),
            est_payoff_time: String(item?.est_payoff_time ?? ""),
          }))
        : [],
    };

    const isMostlyEmpty =
      !normalizedData.client_name &&
      !normalizedData.client_email &&
      !normalizedData.client_phone &&
      !normalizedData.street_address &&
      normalizedData.debt_items.length === 0;

    return new Response(
      JSON.stringify({
        success: true,
        data: normalizedData,
        debug: isMostlyEmpty
          ? {
              message: "Contact payload mapped but key fields are empty",
              top_level_keys:
                forthResult && typeof forthResult === "object" && !Array.isArray(forthResult)
                  ? Object.keys(forthResult as Record<string, unknown>)
                  : [],
              contact_keys:
                contact && typeof contact === "object" && !Array.isArray(contact)
                  ? Object.keys(contact as Record<string, unknown>)
                  : [],
            }
          : undefined,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching CRM data:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch client data from CRM",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
