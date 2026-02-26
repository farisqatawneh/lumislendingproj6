import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DebtReviewDocument } from '../components/DebtReviewDocument';

interface DebtItem {
  id: string;
  creditor: string;
  account_type: string;
  balance: number;
  apr: number | null;
  utilization: number | null;
  est_interest_paid: number | null;
  est_payoff_time: string | null;
}

interface DebtReview {
  id: string;
  client_name: string;
  review_date: string;
  credit_score: number | null;
  credit_tier: string | null;
  overall_credit_utilization: number | null;
  debt_to_income_ratio: number | null;
  own_estimated_term: string | null;
  own_estimated_total_payoff: number | null;
  own_estimated_savings: number | null;
  program_estimated_term: string | null;
  program_estimated_total_payoff: number | null;
  program_estimated_savings: number | null;
}

export const ReviewViewer: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const [review, setReview] = useState<DebtReview | null>(null);
  const [debtItems, setDebtItems] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reviewId) return;

    const fetchReview = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: reviewData, error: reviewError } = await supabase
          .from('debt_reviews')
          .select('*')
          .eq('id', reviewId)
          .maybeSingle();

        if (reviewError) throw reviewError;

        if (!reviewData) {
          setError('Review not found');
          return;
        }

        let preparedBy = '[Agent Name]';
        if (reviewData.rep_id) {
          const { data: repData } = await supabase
            .from('reps')
            .select('full_name')
            .eq('id', reviewData.rep_id)
            .maybeSingle();

          if (repData?.full_name) {
            preparedBy = repData.full_name;
          }
        }

        const { data: itemsData, error: itemsError } = await supabase
          .from('debt_items')
          .select('*')
          .eq('review_id', reviewId)
          .order('created_at', { ascending: true });

        if (itemsError) throw itemsError;

        setReview({ ...reviewData, prepared_by: preparedBy });
        setDebtItems(itemsData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (reviewId) {
      fetchReview();
    }
  }, [reviewId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-teal-700 text-lg">Loading debt review...</p>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Review</h2>
          <p className="text-slate-600">{error || 'Review not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          Print
        </button>
        <button
          onClick={handleDownload}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          Download PDF
        </button>
      </div>
      <DebtReviewDocument review={review} debtItems={debtItems} />
    </div>
  );
};
