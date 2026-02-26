import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
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

    const body = await req.json().catch(() => ({}));
    const applicationId = String(body?.application_id ?? "").trim();

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: "application_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const evvoEmail = Deno.env.get("EVVO_EMAIL");
    const evvoPassword = Deno.env.get("EVVO_PASSWORD");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured (Supabase)" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!evvoEmail || !evvoPassword) {
      return new Response(
        JSON.stringify({
          error: "EVVO_EMAIL and EVVO_PASSWORD secrets are required",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Read the evvo_hash_id from the application
    const { data: app, error: appError } = await adminClient
      .from("loan_applications")
      .select("evvo_hash_id")
      .eq("id", applicationId)
      .single();

    if (appError || !app) {
      return new Response(
        JSON.stringify({
          error: appError?.message ?? "Application not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!app.evvo_hash_id) {
      return new Response(
        JSON.stringify({
          error:
            "No EVVO hash ID stored for this application. The lead may not have been submitted to EVVO yet.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Authenticate with EVVO
    const loginResponse = await fetch(
      "https://www.askevvofinancial.com/api/login",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": "",
        },
        body: JSON.stringify({ email: evvoEmail, password: evvoPassword }),
      }
    );

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

    const token =
      loginResult?.token ?? loginResult?.access_token;
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

    // 3. Fetch offers from EVVO
    const evvoUrl = `https://www.askevvofinancial.com/api/get-offers/${app.evvo_hash_id}`;
    const offersResponse = await fetch(evvoUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const offersRaw = await offersResponse.text().catch(() => "");
    let offersResult: Record<string, unknown> = {};
    try {
      offersResult = JSON.parse(offersRaw);
    } catch {
      return new Response(
        JSON.stringify({
          error: `EVVO returned non-JSON (status ${offersResponse.status})`,
          url_called: evvoUrl,
          raw_body: offersRaw.slice(0, 2000),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!offersResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `EVVO get-offers failed (${offersResponse.status})`,
          url_called: evvoUrl,
          details: offersResult,
        }),
        {
          status: offersResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Store the full response in the database
    const offersArr = Array.isArray(offersResult.offers)
      ? offersResult.offers
      : [];
    const tilesArr = Array.isArray(offersResult.custom_tiles)
      ? offersResult.custom_tiles
      : [];

    const { error: updateError } = await adminClient
      .from("loan_applications")
      .update({
        evvo_offers_data: offersResult,
        offers_available: offersArr.length > 0 || tilesArr.length > 0,
      })
      .eq("id", applicationId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: offersResult,
        url_called: evvoUrl,
        response_keys: Object.keys(offersResult),
        offers_count: offersArr.length,
        custom_tiles_count: tilesArr.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
