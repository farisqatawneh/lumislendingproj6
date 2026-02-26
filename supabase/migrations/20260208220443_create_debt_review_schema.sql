/*
  # Debt & Financial Options Review Schema

  1. New Tables
    - `debt_reviews`
      - `id` (uuid, primary key)
      - `client_name` (text)
      - `review_date` (date)
      - `credit_score` (integer)
      - `credit_tier` (text)
      - `overall_credit_utilization` (numeric)
      - `debt_to_income_ratio` (numeric)
      - `own_estimated_term` (text)
      - `own_estimated_total_payoff` (numeric)
      - `own_estimated_savings` (numeric)
      - `program_estimated_term` (text)
      - `program_estimated_total_payoff` (numeric)
      - `program_estimated_savings` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `debt_items`
      - `id` (uuid, primary key)
      - `review_id` (uuid, foreign key)
      - `creditor` (text)
      - `account_type` (text)
      - `balance` (numeric)
      - `apr` (numeric)
      - `utilization` (numeric)
      - `est_interest_paid` (numeric)
      - `est_payoff_time` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access (client-facing documents)
*/

-- Create debt_reviews table
CREATE TABLE IF NOT EXISTS debt_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  review_date date DEFAULT CURRENT_DATE,
  credit_score integer,
  credit_tier text,
  overall_credit_utilization numeric(5,2),
  debt_to_income_ratio numeric(5,2),
  own_estimated_term text,
  own_estimated_total_payoff numeric(12,2),
  own_estimated_savings numeric(12,2),
  program_estimated_term text,
  program_estimated_total_payoff numeric(12,2),
  program_estimated_savings numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create debt_items table
CREATE TABLE IF NOT EXISTS debt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES debt_reviews(id) ON DELETE CASCADE,
  creditor text NOT NULL,
  account_type text NOT NULL,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  apr numeric(5,2) DEFAULT 0,
  utilization numeric(5,2),
  est_interest_paid numeric(12,2),
  est_payoff_time text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS debt_items_review_id_idx ON debt_items(review_id);

-- Enable RLS
ALTER TABLE debt_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public can view debt reviews"
  ON debt_reviews
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view debt items"
  ON debt_items
  FOR SELECT
  TO public
  USING (true);

-- Service role can insert/update (for webhook)
CREATE POLICY "Service role can insert debt reviews"
  ON debt_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can update debt reviews"
  ON debt_reviews
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can insert debt items"
  ON debt_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can update debt items"
  ON debt_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
