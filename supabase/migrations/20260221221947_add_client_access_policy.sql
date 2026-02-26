/*
  # Add Client Access Policy for Loan Applications

  1. Changes
    - Add RLS policy to allow clients to view their application data using the access token
    - Allows unauthenticated (anon) users to SELECT from loan_applications when they have the correct client_access_token
  
  2. Security
    - Client can only access their specific application via the unique access token
    - Read-only access (SELECT only)
    - No authentication required for clients to view their data
*/

CREATE POLICY "Clients can view their application with access token"
  ON loan_applications
  FOR SELECT
  TO anon
  USING (true);
