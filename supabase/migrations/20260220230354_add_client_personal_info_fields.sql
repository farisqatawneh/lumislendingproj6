/*
  # Add client personal information fields

  1. Changes
    - Add `ssn_last_4` column to `loan_applications` table (last 4 digits of SSN)
    - Add `date_of_birth` column to `loan_applications` table
    - Add `street_address` column to `loan_applications` table
    - Add `city` column to `loan_applications` table
    - Add `state` column to `loan_applications` table (2-letter state code)
    - Add `zip` column to `loan_applications` table (ZIP code)
  
  2. Notes
    - Using IF NOT EXISTS to prevent errors if columns already exist
    - These fields are editable by sales reps during application creation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'ssn_last_4'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN ssn_last_4 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN date_of_birth date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN street_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'city'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'state'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'zip'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN zip text;
  END IF;
END $$;