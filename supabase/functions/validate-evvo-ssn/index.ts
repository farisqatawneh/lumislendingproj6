import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function digitsOnly(value: string | undefined | null) {
  return (value ?? "").replace(/\D/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evvoEmail = Deno.env.get("EVVO_EMAIL");
    const evvoPassword = Deno.env.get("EVVO_PASSWORD");
    if (!evvoEmail || !evvoPassword) {
      return new Response(
        JSON.stringify({ error: "EVVO_EMAIL and EVVO_PASSWORD secrets are required" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const ssn = digitsOnly(body?.ssn);
    const applicationId = String(body?.id ?? "").trim();
    const email = String(body?.email ?? "").trim();
    if (!ssn || !applicationId || !email) {
      return new Response(JSON.stringify({ error: "ssn, id, and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Authenticate each request to get a fresh token.
    const loginResponse = await fetch("https://www.askevvofinancial.com/api/login", {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": "",
      },
      body: JSON.stringify({
        email: evvoEmail,
        password: evvoPassword,
      }),
    });

    const loginResult = await loginResponse.json().catch(() => ({}));
    if (!loginResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `EVVO auth failed (${loginResponse.status})`,
          details: loginResult,
        }),
        {
          status: loginResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = loginResult?.token ?? loginResult?.access_token;
    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({
          error: "EVVO auth succeeded but token was missing",
          details: loginResult,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Send consent email before continuing with the EVVO flow.
    const consentResponse = await fetch("https://www.askevvofinancial.com/api/email-consent", {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: applicationId,
        email,
      }),
    });

    const consentResult = await consentResponse.json().catch(() => ({}));
    if (!consentResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `EVVO email-consent failed (${consentResponse.status})`,
          details: consentResult,
        }),
        {
          status: consentResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Validate the exact SSN for this application.
    const validateResponse = await fetch("https://www.askevvofinancial.com/api/validate-ssn", {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ssn }),
    });

    const validateResult = await validateResponse.json().catch(() => ({}));
    if (!validateResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `EVVO validate-ssn failed (${validateResponse.status})`,
          details: validateResult,
        }),
        {
          status: validateResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: validateResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to validate SSN with EVVO",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
