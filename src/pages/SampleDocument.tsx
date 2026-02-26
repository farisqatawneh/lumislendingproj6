import { DebtReviewDocument } from '../components/DebtReviewDocument';

export const SampleDocument = () => {
  const sampleReview = {
    id: 'sample-123',
    client_name: 'Sarah Johnson',
    review_date: '2026-02-08',
    credit_score: 540,
    credit_tier: 'Poor',
    overall_credit_utilization: 45,
    debt_to_income_ratio: 24,
    own_estimated_term: '62 months',
    own_estimated_total_payoff: 61900,
    own_estimated_savings: 0,
    program_estimated_term: '4 years',
    program_estimated_total_payoff: 31200,
    program_estimated_savings: 30700,
  };

  const sampleDebtItems = [
    {
      id: '1',
      creditor: 'Chase Bank',
      account_type: 'Credit Card',
      balance: 12500,
      minimum_payment: 375,
      apr: 22,
      utilization: 50,
      est_interest_paid: 7000,
      est_payoff_time: '52 months',
    },
    {
      id: '2',
      creditor: 'Capital One',
      account_type: 'Credit Card',
      balance: 8300,
      minimum_payment: 225,
      apr: 22,
      utilization: 42,
      est_interest_paid: 5650,
      est_payoff_time: '62 months',
    },
    {
      id: '3',
      creditor: 'Discover',
      account_type: 'Credit Card',
      balance: 6700,
      minimum_payment: 185,
      apr: 22,
      utilization: 38,
      est_interest_paid: 4400,
      est_payoff_time: '60 months',
    },
    {
      id: '4',
      creditor: 'American Express',
      account_type: 'Credit Card',
      balance: 4200,
      minimum_payment: 125,
      apr: 22,
      utilization: 45,
      est_interest_paid: 2425,
      est_payoff_time: '53 months',
    },
    {
      id: '5',
      creditor: 'Wells Fargo',
      account_type: 'Personal Loan',
      balance: 8500,
      minimum_payment: 195,
      apr: 10,
      utilization: null,
      est_interest_paid: 2225,
      est_payoff_time: '55 months',
    },
  ];

  return <DebtReviewDocument review={sampleReview} debtItems={sampleDebtItems} />;
};
