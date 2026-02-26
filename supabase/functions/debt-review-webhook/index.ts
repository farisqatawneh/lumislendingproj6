import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DebtItem {
  creditor: string;
  account_type: string;
  balance: number;
  minimum_payment?: number;
  apr?: number;
  utilization?: number;
  est_interest_paid?: number;
  est_payoff_time?: string;
}

interface DebtReviewPayload {
  client_name: string;
  review_date?: string;
  credit_score?: number;
  credit_tier?: string;
  overall_credit_utilization?: number;
  debt_to_income_ratio?: number;
  own_estimated_term?: string;
  own_estimated_total_payoff?: number;
  own_estimated_savings?: number;
  program_estimated_term?: string;
  program_estimated_total_payoff?: number;
  program_estimated_savings?: number;
  program_monthly_payment?: number;
  debt_items: DebtItem[];
}

function calculateDebtPayoff(balance: number, minimumPayment: number, accountType: string) {
  const annualRate = accountType.toLowerCase().includes('loan') ? 0.10 : 0.22;
  const monthlyRate = annualRate / 12;

  if (minimumPayment <= 0 || balance <= 0) {
    return {
      payoffMonths: 0,
      totalPayoff: balance,
      interestPaid: 0,
      apr: annualRate * 100
    };
  }

  if (minimumPayment <= balance * monthlyRate) {
    return {
      payoffMonths: 999,
      totalPayoff: balance * 10,
      interestPaid: balance * 9,
      apr: annualRate * 100
    };
  }

  const payoffMonths = Math.ceil(
    -Math.log(1 - (balance * monthlyRate / minimumPayment)) / Math.log(1 + monthlyRate)
  );

  const totalPayoff = minimumPayment * payoffMonths;
  const interestPaid = totalPayoff - balance;

  return {
    payoffMonths,
    totalPayoff,
    interestPaid,
    apr: annualRate * 100
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "POST") {
      const payload: DebtReviewPayload = await req.json();

      if (!payload.client_name || !payload.debt_items || payload.debt_items.length === 0) {
        return new Response(
          JSON.stringify({ error: "client_name and debt_items are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: review, error: reviewError } = await supabase
        .from("debt_reviews")
        .insert({
          client_name: payload.client_name,
          review_date: payload.review_date || new Date().toISOString().split('T')[0],
          credit_score: payload.credit_score,
          credit_tier: payload.credit_tier,
          overall_credit_utilization: payload.overall_credit_utilization,
          debt_to_income_ratio: payload.debt_to_income_ratio,
          own_estimated_term: payload.own_estimated_term,
          own_estimated_total_payoff: payload.own_estimated_total_payoff,
          own_estimated_savings: payload.own_estimated_savings,
          program_estimated_term: payload.program_estimated_term,
          program_estimated_total_payoff: payload.program_estimated_total_payoff,
          program_estimated_savings: payload.program_estimated_savings,
          program_monthly_payment: payload.program_monthly_payment,
        })
        .select()
        .single();

      if (reviewError) {
        throw reviewError;
      }

      const debtItemsToInsert = payload.debt_items.map((item) => {
        const minPayment = item.minimum_payment || 0;
        const calculations = calculateDebtPayoff(item.balance, minPayment, item.account_type);

        return {
          review_id: review.id,
          creditor: item.creditor,
          account_type: item.account_type,
          balance: item.balance,
          minimum_payment: minPayment,
          apr: calculations.apr,
          utilization: item.utilization,
          est_interest_paid: calculations.interestPaid,
          est_payoff_time: `${calculations.payoffMonths} months`,
        };
      });

      const totalBalance = debtItemsToInsert.reduce((sum, item) => sum + item.balance, 0);
      const totalMinPayment = debtItemsToInsert.reduce((sum, item) => sum + item.minimum_payment, 0);
      const totalInterest = debtItemsToInsert.reduce((sum, item) => sum + item.est_interest_paid, 0);
      const longestPayoffMonths = Math.max(...debtItemsToInsert.map(item => parseInt(item.est_payoff_time)));
      const ownEstimatedTotalPayoff = totalBalance + totalInterest;

      const updatedReview = await supabase
        .from("debt_reviews")
        .update({
          own_estimated_term: payload.own_estimated_term || `${longestPayoffMonths} months`,
          own_estimated_total_payoff: payload.own_estimated_total_payoff || ownEstimatedTotalPayoff,
          own_estimated_savings: payload.own_estimated_savings || 0,
        })
        .eq('id', review.id);

      const { error: itemsError } = await supabase
        .from("debt_items")
        .insert(debtItemsToInsert);

      if (itemsError) {
        throw itemsError;
      }

      const documentUrl = `${req.headers.get("origin") || supabaseUrl}/review/${review.id}`;

      return new Response(
        JSON.stringify({
          success: true,
          review_id: review.id,
          document_url: documentUrl,
          message: "Debt review created successfully",
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
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
