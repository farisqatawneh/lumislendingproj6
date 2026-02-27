DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reps' AND column_name = 'evvo_email'
  ) THEN
    ALTER TABLE reps ADD COLUMN evvo_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reps' AND column_name = 'evvo_password'
  ) THEN
    ALTER TABLE reps ADD COLUMN evvo_password text;
  END IF;
END $$;
