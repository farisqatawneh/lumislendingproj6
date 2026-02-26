/*
  # Add financial document URL to loan applications

  1. Changes
    - Add `financial_document_url` to `loan_applications` table
    - Stores generated report link returned by external webhook
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'financial_document_url'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN financial_document_url text;
  END IF;
END $$;
