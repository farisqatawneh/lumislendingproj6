/*
  # Add Loan Application Fields

  1. Changes
    - Add loan application related fields to `loan_applications` table:
      - `loan_purpose` (text) - Purpose of the loan (debt consolidation, home improvement, etc.)
      - `loan_amount` (numeric) - Requested loan amount
      - `provided_credit_rating` (text) - Client's self-reported credit rating
      - `employment_status` (text) - Client's employment status
      - `pay_frequency` (text) - How often the client is paid
      - `annual_income` (numeric) - Client's gross annual income
      - `education_level` (text) - Client's education level
      - `property_status` (text) - Client's property ownership status
  
  2. Notes
    - All new fields are nullable to maintain backward compatibility
    - These fields capture additional information about the loan application
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'loan_purpose'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN loan_purpose text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'loan_amount'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN loan_amount numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'provided_credit_rating'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN provided_credit_rating text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'employment_status'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN employment_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'pay_frequency'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN pay_frequency text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'annual_income'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN annual_income numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'education_level'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN education_level text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'property_status'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN property_status text;
  END IF;
END $$;
