/*
  # Add Client Access Policy for Loan Offers

  1. Changes
    - Add RLS policy to allow clients to view loan offers for their application
    - Allows unauthenticated (anon) users to SELECT from loan_offers
  
  2. Security
    - Read-only access (SELECT only)
    - Clients can view all offers (they'll be filtered by application_id in the query)
*/

CREATE POLICY "Clients can view loan offers"
  ON loan_offers
  FOR SELECT
  TO anon
  USING (true);
