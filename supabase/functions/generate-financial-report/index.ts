import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function extractFirstUrl(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;

  if (typeof value === "string") {
    const match = value.match(/https?:\/\/[^\s"']+/i);
    return match ? match[0] : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractFirstUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["url", "link", "document_url", "report_url", "financial_report_url"]) {
      const candidate = obj[key];
      if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) return candidate;
    }
    for (const entry of Object.values(obj)) {
      const found = extractFirstUrl(entry, depth + 1);
      if (found) return found;
    }
  }

  return null;
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

    const webhookUrl =
      Deno.env.get("FINANCIAL_REPORT_WEBHOOK_URL") ??
      "https://qatawnehhh.app.n8n.cloud/webhook/001d8c79-197a-412b-90e7-bc28e0cd596b";

    const payload = await req.json();

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawText = await webhookResponse.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }

    if (!webhookResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `Financial report webhook failed (${webhookResponse.status})`,
          details: parsed,
        }),
        {
          status: webhookResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const reportUrl = extractFirstUrl(parsed);
    if (!reportUrl) {
      return new Response(
        JSON.stringify({
          error: "Webhook succeeded but did not return a report URL",
          details: parsed,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_url: reportUrl,
        raw: parsed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to generate financial report",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
