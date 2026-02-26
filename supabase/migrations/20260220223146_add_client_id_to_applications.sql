/*
  # Add client_id field to loan_applications

  1. Changes
    - Add `client_id` column to `loan_applications` table
    - This will store the CRM client ID used to fetch data
  
  2. Notes
    - Using IF NOT EXISTS to prevent errors if column already exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN client_id text;
  END IF;
END $$;