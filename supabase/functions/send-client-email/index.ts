import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailPayload {
  to: string;
  client_name: string;
  client_link: string;
}

function extractFirstName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? "there";
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

    const payload: EmailPayload = await req.json();

    if (!payload.to || !payload.client_name || !payload.client_link) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, client_name, client_link" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      return new Response(
        JSON.stringify({ error: "SENDGRID_API_KEY secret is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const firstName = extractFirstName(payload.client_name);
    const message = `Hello ${firstName}

Complete your loan application now
You can access it using the link below: ${payload.client_link}

If you have any questions after reviewing it, please don’t hesitate to
reach out.

Thank you,`;

    const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: payload.to }],
          },
        ],
        from: {
          email: "support@lumislending.com",
          name: "Lumis Lending",
        },
        subject: "Complete Your Loan Application",
        content: [
          {
            type: "text/plain",
            value: message,
          },
          {
            type: "text/html",
            value: `
<p>Hello ${firstName},</p>
<p>Complete your loan application now.</p>
<p>You can access it using the link below: <a href="${payload.client_link}">[link]</a></p>
<p>If you have any questions after reviewing it, please don't hesitate to reach out.</p>
<p>Thank you,</p>
            `.trim(),
          },
        ],
      }),
    });

    if (!sendgridResponse.ok) {
      const sendgridError = await sendgridResponse.text();
      return new Response(
        JSON.stringify({
          error: `SendGrid request failed (${sendgridResponse.status})`,
          details: sendgridError,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        details: {
          to: payload.to,
          client_name: payload.client_name,
          client_link: payload.client_link,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
