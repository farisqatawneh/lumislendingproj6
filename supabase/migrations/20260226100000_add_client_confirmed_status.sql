-- Add 'client_confirmed' to the allowed status values for loan_applications
ALTER TABLE loan_applications DROP CONSTRAINT loan_applications_status_check;
ALTER TABLE loan_applications ADD CONSTRAINT loan_applications_status_check
  CHECK (status IN ('pending', 'client_confirmed', 'approved', 'rejected'));
