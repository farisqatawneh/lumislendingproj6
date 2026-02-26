/*
  # Add Loan Offers and Release Controls

  1. New Tables
    - `loan_offers`
      - `id` (uuid, primary key)
      - `application_id` (uuid, foreign key to loan_applications)
      - `lender_name` (text)
      - `loan_amount` (numeric)
      - `apr` (numeric)
      - `term_months` (integer)
      - `monthly_payment` (numeric)
      - `total_repayment` (numeric)
      - `created_at` (timestamp)
    
  2. Changes to `loan_applications` table
    - Add `offers_released_at` (timestamp, nullable) - when rep releases offers to client
    - Add `financial_analysis_released_at` (timestamp, nullable) - when rep releases financial analysis to client
    - Add `client_access_token` (uuid) - unique token for client to access their application
    - Add `offers_available` (boolean, default false) - whether offers have been fetched
    - Add `offers_checked_at` (timestamp, nullable) - when offers were last checked

  3. Security
    - Enable RLS on `loan_offers` table
    - Add policies for reps to manage offers
    - Add policies for clients to view released offers using access token
*/

-- Create loan_offers table
CREATE TABLE IF NOT EXISTS loan_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  lender_name text NOT NULL,
  loan_amount numeric NOT NULL DEFAULT 0,
  apr numeric NOT NULL DEFAULT 0,
  term_months integer NOT NULL DEFAULT 0,
  monthly_payment numeric NOT NULL DEFAULT 0,
  total_repayment numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE loan_offers ENABLE ROW LEVEL SECURITY;

-- Add new columns to loan_applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'offers_released_at'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN offers_released_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'financial_analysis_released_at'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN financial_analysis_released_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'client_access_token'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN client_access_token uuid DEFAULT gen_random_uuid() UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'offers_available'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN offers_available boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'offers_checked_at'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN offers_checked_at timestamptz;
  END IF;
END $$;

-- RLS Policies for loan_offers

-- Reps can view all offers for their applications
CREATE POLICY "Reps can view offers for their applications"
  ON loan_offers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loan_applications
      WHERE loan_applications.id = loan_offers.application_id
      AND loan_applications.rep_id = auth.uid()
    )
  );

-- Reps can insert offers for their applications
CREATE POLICY "Reps can insert offers for their applications"
  ON loan_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loan_applications
      WHERE loan_applications.id = loan_offers.application_id
      AND loan_applications.rep_id = auth.uid()
    )
  );

-- Reps can update offers for their applications
CREATE POLICY "Reps can update offers for their applications"
  ON loan_offers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loan_applications
      WHERE loan_applications.id = loan_offers.application_id
      AND loan_applications.rep_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loan_applications
      WHERE loan_applications.id = loan_offers.application_id
      AND loan_applications.rep_id = auth.uid()
    )
  );

-- Reps can delete offers for their applications
CREATE POLICY "Reps can delete offers for their applications"
  ON loan_offers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loan_applications
      WHERE loan_applications.id = loan_offers.application_id
      AND loan_applications.rep_id = auth.uid()
    )
  );

-- Update loan_applications RLS to allow reps to update release timestamps
CREATE POLICY "Reps can update release timestamps for their applications"
  ON loan_applications
  FOR UPDATE
  TO authenticated
  USING (rep_id = auth.uid())
  WITH CHECK (rep_id = auth.uid());