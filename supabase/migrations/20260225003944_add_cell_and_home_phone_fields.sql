/*
  # Add Cell Phone and Home Phone Fields

  1. Changes
    - Add `cell_phone` field to `loan_applications` table (nullable text)
    - Add `home_phone` field to `loan_applications` table (nullable text)
    - Existing `client_phone` field remains for backward compatibility

  2. Notes
    - These fields allow reps to collect separate cell and home phone numbers
    - All phone fields are nullable to allow flexibility in data collection
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'cell_phone'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN cell_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'home_phone'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN home_phone text;
  END IF;
END $$;