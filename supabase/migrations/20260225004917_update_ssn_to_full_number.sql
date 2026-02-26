/*
  # Update SSN Field to Store Full Number

  1. Changes
    - Rename `ssn_last_4` column to `ssn` in `loan_applications` table
    - Update column to store full 9-digit SSN instead of just last 4 digits
    - Column remains text type to preserve formatting flexibility

  2. Security
    - Existing RLS policies continue to protect SSN data
    - Only authorized reps and clients can access application data

  3. Notes
    - This migration safely renames the column
    - Existing data is preserved during the rename
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'ssn_last_4'
  ) THEN
    ALTER TABLE loan_applications RENAME COLUMN ssn_last_4 TO ssn;
  END IF;
END $$;
