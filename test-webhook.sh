#!/bin/bash

WEBHOOK_URL="https://riojgblbnfyzfxxlzcrb.supabase.co/functions/v1/debt-review-webhook"

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "John Doe",
    "review_date": "2026-02-08",
    "credit_score": 650,
    "credit_tier": "Fair",
    "overall_credit_utilization": 75.5,
    "debt_to_income_ratio": 42.3,
    "own_estimated_term": "5-7 years",
    "own_estimated_total_payoff": 45000,
    "own_estimated_savings": 0,
    "program_estimated_term": "2-4 years",
    "program_estimated_total_payoff": 27000,
    "program_estimated_savings": 18000,
    "debt_items": [
      {
        "creditor": "Chase Bank",
        "account_type": "Credit Card",
        "balance": 8500,
        "apr": 22.99,
        "utilization": 85,
        "est_interest_paid": 3200,
        "est_payoff_time": "4-5 years"
      },
      {
        "creditor": "Capital One",
        "account_type": "Credit Card",
        "balance": 5200,
        "apr": 19.99,
        "utilization": 90,
        "est_interest_paid": 1800,
        "est_payoff_time": "4 years"
      },
      {
        "creditor": "Discover",
        "account_type": "Credit Card",
        "balance": 3800,
        "apr": 24.99,
        "utilization": 95,
        "est_interest_paid": 1500,
        "est_payoff_time": "2-3 years"
      }
    ]
  }'
