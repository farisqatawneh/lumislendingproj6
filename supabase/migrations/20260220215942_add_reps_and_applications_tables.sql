/*
  # Add Rep Management and Application System

  1. New Tables
    - `reps`
      - `id` (uuid, primary key) - linked to auth.users
      - `email` (text, unique)
      - `full_name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `loan_applications`
      - `id` (uuid, primary key)
      - `rep_id` (uuid, foreign key to reps)
      - `review_id` (uuid, foreign key to debt_reviews)
      - `status` (text) - pending, approved, rejected
      - `client_email` (text)
      - `client_phone` (text)
      - `notes` (text)
      - `submitted_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `rep_id` column to `debt_reviews` to track which rep created the review
    - Add `application_id` column to `debt_reviews` to link reviews to applications

  3. Security
    - Enable RLS on all new tables
    - Reps can only view and manage their own applications
    - Reps can create debt reviews and applications
    - Public can still view debt reviews (for client-facing documents)

  4. Notes
    - Reps are authenticated users who can log in
    - Each application is linked to a debt review
    - Applications track the submission status
*/

-- Create reps table
CREATE TABLE IF NOT EXISTS reps (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create loan_applications table
CREATE TABLE IF NOT EXISTS loan_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id uuid NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  review_id uuid REFERENCES debt_reviews(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  client_email text,
  client_phone text,
  notes text,
  submitted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add rep_id to debt_reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debt_reviews' AND column_name = 'rep_id'
  ) THEN
    ALTER TABLE debt_reviews ADD COLUMN rep_id uuid REFERENCES reps(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add application_id to debt_reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debt_reviews' AND column_name = 'application_id'
  ) THEN
    ALTER TABLE debt_reviews ADD COLUMN application_id uuid REFERENCES loan_applications(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS loan_applications_rep_id_idx ON loan_applications(rep_id);
CREATE INDEX IF NOT EXISTS loan_applications_review_id_idx ON loan_applications(review_id);
CREATE INDEX IF NOT EXISTS debt_reviews_rep_id_idx ON debt_reviews(rep_id);

-- Enable RLS
ALTER TABLE reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

-- Policies for reps table
CREATE POLICY "Reps can view their own profile"
  ON reps
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Reps can update their own profile"
  ON reps
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "New reps can insert their profile"
  ON reps
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies for loan_applications table
CREATE POLICY "Reps can view their own applications"
  ON loan_applications
  FOR SELECT
  TO authenticated
  USING (rep_id = auth.uid());

CREATE POLICY "Reps can create applications"
  ON loan_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (rep_id = auth.uid());

CREATE POLICY "Reps can update their own applications"
  ON loan_applications
  FOR UPDATE
  TO authenticated
  USING (rep_id = auth.uid())
  WITH CHECK (rep_id = auth.uid());

CREATE POLICY "Reps can delete their own applications"
  ON loan_applications
  FOR DELETE
  TO authenticated
  USING (rep_id = auth.uid());

-- Update debt_reviews policies for authenticated reps
CREATE POLICY "Reps can create debt reviews"
  ON debt_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (rep_id = auth.uid());

CREATE POLICY "Reps can view their own debt reviews"
  ON debt_reviews
  FOR SELECT
  TO authenticated
  USING (rep_id = auth.uid());

CREATE POLICY "Reps can update their own debt reviews"
  ON debt_reviews
  FOR UPDATE
  TO authenticated
  USING (rep_id = auth.uid())
  WITH CHECK (rep_id = auth.uid());

-- Update debt_items policies for reps
CREATE POLICY "Reps can create debt items for their reviews"
  ON debt_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM debt_reviews
      WHERE debt_reviews.id = debt_items.review_id
      AND debt_reviews.rep_id = auth.uid()
    )
  );

CREATE POLICY "Reps can view debt items for their reviews"
  ON debt_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM debt_reviews
      WHERE debt_reviews.id = debt_items.review_id
      AND debt_reviews.rep_id = auth.uid()
    )
  );

CREATE POLICY "Reps can update debt items for their reviews"
  ON debt_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM debt_reviews
      WHERE debt_reviews.id = debt_items.review_id
      AND debt_reviews.rep_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM debt_reviews
      WHERE debt_reviews.id = debt_items.review_id
      AND debt_reviews.rep_id = auth.uid()
    )
  );