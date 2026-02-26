-- Add EVVO-specific columns to loan_applications for the get-offers integration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'evvo_hash_id'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN evvo_hash_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loan_applications' AND column_name = 'evvo_offers_data'
  ) THEN
    ALTER TABLE loan_applications ADD COLUMN evvo_offers_data jsonb;
  END IF;
END $$;
