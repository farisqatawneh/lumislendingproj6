import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SubmitEvvoPayload {
  rep_id?: string;
  client_id?: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  cell_phone?: string;
  home_phone?: string;
  ssn: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  loan_purpose?: string;
  loan_amount?: number | string | null;
  provided_credit_rating?: string;
  employment_status?: string;
  pay_frequency?: string;
  annual_income?: number | string | null;
  education_level?: string;
  property_status?: string;
  evvo_agent_email?: string;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function digitsOnly(value: string | undefined | null) {
  return (value ?? "").replace(/\D/g, "");
}

function sanitizeName(value: string) {
  return value.replace(/[^A-Za-z -]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePhone10(value: string | undefined | null) {
  const digits = digitsOnly(value);
  if (digits.length < 10) return "";
  return digits.slice(-10);
}

function toStringOrUndefined(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}

function mapPropertyStatus(value: string | undefined) {
  if (!value) return undefined;
  if (value === "own") return "own_outright";
  return value;
}

function mapPurpose(value: string | undefined) {
  if (!value) return "";
  const map: Record<string, string> = {
    auto: "auto",
    business: "business",
    cosmetic: "cosmetic",
    credit_card_refinance: "credit_card_refi",
    credit_card_refi: "credit_card_refi",
    debt_consolidation: "debt_consolidation",
    emergency: "emergency",
    green: "green",
    home_improvement: "home_improvement",
    household_expenses: "household_expenses",
    large_purchases: "large_purchases",
    life_event: "life_event",
    medical_dental: "medical_dental",
    moving_relocation: "moving_relocation",
    student_loan_refinance: "student_loan_refi",
    student_loan_refi: "student_loan_refi",
    taxes: "taxes",
    vacation: "vacation",
  };
  return map[value] ?? "";
}

function mapCreditRating(value: string | undefined) {
  if (!value) return "";
  const map: Record<string, string> = {
    excellent: "excellent",
    good: "good",
    fair: "fair",
    poor: "poor",
    low: "poor",
  };
  return map[value] ?? "";
}

function mapEmploymentStatus(value: string | undefined) {
  if (!value) return "";
  const map: Record<string, string> = {
    employed: "employed",
    military: "military",
    not_employed: "not_employed",
    retired: "retired",
    self_employed: "self_employed",
    student: "student",
    pension: "pension",
    disability: "disability",
  };
  return map[value] ?? "";
}

function mapPayFrequency(value: string | undefined) {
  if (!value) return "";
  const map: Record<string, string> = {
    weekly: "weekly",
    biweekly: "biweekly",
    twice_per_month: "twice_monthly",
    twice_monthly: "twice_monthly",
    once_per_month: "monthly",
    monthly: "monthly",
  };
  return map[value] ?? "";
}

function mapEducationLevel(value: string | undefined) {
  if (!value) return "";
  const normalized = value.toLowerCase();
  const map: Record<string, string> = {
    masters: "masters",
    high_school_diploma: "high_school",
    high_school: "high_school",
    associate_degree: "associate",
    associate: "associate",
    bachelor_degree: "bachelors",
    bachelors: "bachelors",
    other_graduate_degree: "other_grad_degree",
    other_grad_degree: "other_grad_degree",
    other: "other",
  };
  return map[normalized] ?? "";
}

function splitAddressAndUnit(streetAddress: string) {
  const value = streetAddress.trim();
  if (!value) return { address: "", unit: "" };

  const unitRegex = /^(.*?)(?:\s+(Apt|Apartment|Unit|#)\s*([A-Za-z0-9-]+))$/i;
  const match = value.match(unitRegex);
  if (!match) {
    return { address: value, unit: "" };
  }

  return {
    address: match[1].trim(),
    unit: `${match[2]} ${match[3]}`.trim(),
  };
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload: SubmitEvvoPayload = await req.json();
    const evvoSource = Deno.env.get("EVVO_SOURCE") ?? "Salesforce";

    let evvoEmail = Deno.env.get("EVVO_EMAIL") ?? "";
    let evvoPassword = Deno.env.get("EVVO_PASSWORD") ?? "";

    if (payload.rep_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey) {
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        const { data: repData } = await adminClient
          .from("reps")
          .select("evvo_email, evvo_password")
          .eq("id", payload.rep_id)
          .single();

        if (repData?.evvo_email && repData?.evvo_password) {
          evvoEmail = repData.evvo_email;
          evvoPassword = repData.evvo_password;
        }
      }
    }

    const defaultEvvoAgentEmail = evvoEmail;

    if (!evvoEmail || !evvoPassword) {
      return new Response(
        JSON.stringify({ error: "EVVO credentials not configured. Go to Dashboard → EVVO Settings to set up your EVVO account." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!payload.client_name || !payload.client_email || !payload.ssn) {
      return new Response(
        JSON.stringify({ error: "client_name, client_email, and ssn are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Authenticate on every request and get fresh bearer token.
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

    // Step 2: Submit lead using the fresh bearer token.
    const { firstName, lastName } = splitName(payload.client_name);
    const safeFirstName = sanitizeName(firstName) || "Client";
    const safeLastName = sanitizeName(lastName) || "Unknown";
    const { address, unit } = splitAddressAndUnit(payload.street_address);
    const evvoAgentEmail = payload.evvo_agent_email || defaultEvvoAgentEmail;
    const normalizedCellPhone =
      normalizePhone10(payload.cell_phone) || normalizePhone10(payload.client_phone);
    const normalizedHomePhone =
      normalizePhone10(payload.home_phone) || normalizePhone10(payload.client_phone);
    const evvoLeadPayload = {
      firstname: safeFirstName,
      lastname: safeLastName,
      email: payload.client_email,
      cell_phone: normalizedCellPhone,
      home_phone: normalizedHomePhone,
      birthday: payload.date_of_birth,
      address: address,
      unit: unit,
      city: payload.city,
      state: payload.state,
      zip: digitsOnly(payload.zip).slice(0, 5).padStart(5, "0"),
      country: "United States",
      ssn: digitsOnly(payload.ssn),
      purpose: mapPurpose(toStringOrUndefined(payload.loan_purpose)),
      loan_amount: toStringOrUndefined(payload.loan_amount) ?? "",
      credit_rating: mapCreditRating(toStringOrUndefined(payload.provided_credit_rating)),
      employment_status: mapEmploymentStatus(toStringOrUndefined(payload.employment_status)),
      employment_pay_frequency: mapPayFrequency(toStringOrUndefined(payload.pay_frequency)),
      annual_income: toStringOrUndefined(payload.annual_income) ?? "",
      education_level: mapEducationLevel(toStringOrUndefined(payload.education_level)),
      property_status: mapPropertyStatus(payload.property_status),
      evvo_agent_email: evvoAgentEmail,
      source: evvoSource,
      coborrowerfirst: "",
      coborrowerlast: "",
      coborrowerdob: "",
      coborrowerincome: "",
      coborroweraddr1: "",
      coborroweraddr2: "",
      coborrowercity: "",
      coborrowerstate: "",
      coborrowerzip: "",
      date_format: "yyyy-mm-dd",
      affiliate_lead_value: payload.client_id ?? "",
    };

    const leadResponse = await fetch("https://www.askevvofinancial.com/api/incoming-leads", {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(evvoLeadPayload),
    });

    const leadResult = await leadResponse.json().catch(() => ({}));
    const leadHasValidationErrors =
      !!leadResult?.error && typeof leadResult?.response === "object" && leadResult?.response !== null;
    if (!leadResponse.ok || leadHasValidationErrors) {
      return new Response(
        JSON.stringify({
          error: `EVVO lead submission failed (${leadResponse.status})`,
          details: leadResult,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: leadResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to submit lead to EVVO",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
