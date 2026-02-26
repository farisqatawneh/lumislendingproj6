/*
  # Add Monthly Payment Fields

  1. Changes
    - Add `minimum_payment` column to `debt_items` table
      - This field stores the minimum payment required for each debt item
    - Add `program_monthly_payment` column to `debt_reviews` table
      - This field stores the estimated monthly payment for the debt resolution program
  
  2. Notes
    - Using numeric(12,2) for currency values to maintain consistency
    - Existing records will have NULL values for these new fields
*/

-- Add minimum_payment to debt_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debt_items' AND column_name = 'minimum_payment'
  ) THEN
    ALTER TABLE debt_items ADD COLUMN minimum_payment numeric(12,2);
  END IF;
END $$;

-- Add program_monthly_payment to debt_reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debt_reviews' AND column_name = 'program_monthly_payment'
  ) THEN
    ALTER TABLE debt_reviews ADD COLUMN program_monthly_payment numeric(12,2);
  END IF;
END $$;
