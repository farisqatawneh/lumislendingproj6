import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Eye, EyeOff, Send, Plus, Trash2, Loader2, FileText, Link } from 'lucide-react';

interface LoanOffer {
  id: string;
  lender_name: string;
  loan_amount: number;
  apr: number;
  term_months: number;
  monthly_payment: number;
  total_repayment: number;
}

interface Application {
  id: string;
  client_email: string;
  status: string | null;
  offers_released_at: string | null;
  financial_analysis_released_at: string | null;
  financial_document_url: string | null;
  offers_available: boolean;
  client_access_token: string;
  review_id: string;
  evvo_hash_id: string | null;
  debt_reviews: {
    client_name: string;
    credit_score: number;
    credit_tier: string;
    overall_credit_utilization: number;
    debt_to_income_ratio: number;
  } | null;
}

export function RepReviewPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const { rep } = useAuth();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [offers, setOffers] = useState<LoanOffer[]>([]);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [offersLinkInput, setOffersLinkInput] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const loadData = useCallback(async () => {
    if (!reviewId || !rep?.id) return;

    try {
      const { data: appData, error: appError } = await supabase
        .from('loan_applications')
        .select(`
          id,
          client_email,
          status,
          offers_released_at,
          financial_analysis_released_at,
          financial_document_url,
          offers_available,
          client_access_token,
          review_id,
          evvo_hash_id,
          debt_reviews!loan_applications_review_id_fkey (
            client_name,
            credit_score,
            credit_tier,
            overall_credit_utilization,
            debt_to_income_ratio
          )
        `)
        .eq('review_id', reviewId)
        .eq('rep_id', rep.id)
        .maybeSingle();

      if (appError) throw appError;
      if (!appData) {
        navigate('/dashboard');
        return;
      }

      const normalizedDebtReview = Array.isArray(appData.debt_reviews)
        ? appData.debt_reviews[0] ?? null
        : appData.debt_reviews;

      setApplication({
        ...appData,
        debt_reviews: normalizedDebtReview,
      } as Application);

      const { data: offersData, error: offersError } = await supabase
        .from('loan_offers')
        .select('*')
        .eq('application_id', appData.id)
        .order('apr', { ascending: true });

      if (offersError) throw offersError;
      setOffers(offersData || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [reviewId, rep?.id, navigate]);

  // Keep a ref that always points to the latest loadData
  const loadRef = useRef(loadData);
  useEffect(() => {
    loadRef.current = loadData;
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime listener for instant updates
  useEffect(() => {
    if (!reviewId) return;

    const channel = supabase
      .channel(`rep-review-${reviewId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loan_applications',
          filter: `review_id=eq.${reviewId}`,
        },
        () => {
          loadRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reviewId]);

  // Polling fallback every 3s so updates are never missed
  useEffect(() => {
    if (!reviewId || !rep?.id) return;

    const interval = setInterval(() => {
      loadRef.current();
    }, 3000);

    return () => clearInterval(interval);
  }, [reviewId, rep?.id]);

  async function handleDeleteOffer(offerId: string) {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    try {
      const { error } = await supabase
        .from('loan_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error deleting offer:', err);
      alert('Failed to delete offer');
    }
  }

  async function handleSaveOffersLink() {
    if (!application || !offersLinkInput.trim()) return;

    setSavingLink(true);
    try {
      const { error } = await supabase
        .from('loan_applications')
        .update({ evvo_hash_id: offersLinkInput.trim() })
        .eq('id', application.id);

      if (error) throw new Error(error.message);
      setOffersLinkInput('');
      setShowAddOffer(false);
      loadData();
    } catch (err) {
      console.error('Error saving offers link:', err);
      alert(err instanceof Error ? err.message : 'Failed to save offers link');
    } finally {
      setSavingLink(false);
    }
  }

  async function handleReleaseOffers() {
    if (!application) return;
    if (!confirm('Release loan offers to client? They will be able to view them immediately.')) return;

    setReleasing(true);
    try {
      const { data, error } = await supabase
        .from('loan_applications')
        .update({ offers_released_at: new Date().toISOString() })
        .eq('id', application.id)
        .select('id, offers_released_at')
        .single();

      if (error) throw new Error(error.message);
      if (!data?.offers_released_at) throw new Error('Update had no effect — row may not exist or access was denied');

      loadData();
    } catch (err) {
      console.error('Error releasing offers:', err);
      alert(err instanceof Error ? err.message : 'Failed to release offers');
    } finally {
      setReleasing(false);
    }
  }

  async function handleReleaseFinancialAnalysis() {
    if (!application) return;
    if (!confirm('Release financial analysis to client? They will be able to view it immediately.')) return;

    setReleasing(true);
    try {
      const { data, error } = await supabase
        .from('loan_applications')
        .update({ financial_analysis_released_at: new Date().toISOString() })
        .eq('id', application.id)
        .select('id, financial_analysis_released_at')
        .single();

      if (error) throw new Error(error.message);
      if (!data?.financial_analysis_released_at) throw new Error('Update had no effect — row may not exist or access was denied');

      loadData();
    } catch (err) {
      console.error('Error releasing financial analysis:', err);
      alert(err instanceof Error ? err.message : 'Failed to release financial analysis');
    } finally {
      setReleasing(false);
    }
  }

  function copyClientLink() {
    if (!application) return;
    const link = `${window.location.origin}/client/${application.client_access_token}`;
    navigator.clipboard.writeText(link);
    alert('Client link copied to clipboard!');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!application) {
    return null;
  }

  const clientLink = `${window.location.origin}/client/${application.client_access_token}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-300 hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl p-6 mb-6">
          <h1 className="text-3xl font-black text-white mb-4">
            Review Application
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-400">Client Name</div>
              <div className="text-lg font-semibold text-white">
                {application.debt_reviews?.client_name || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Client Email</div>
              <div className="text-lg font-semibold text-white">{application.client_email}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Credit Score</div>
              <div className="text-lg font-semibold text-white">
                {application.debt_reviews?.credit_score || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Credit Tier</div>
              <div className="text-lg font-semibold text-teal-400">
                {application.debt_reviews?.credit_tier || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Client Confirmation</div>
              <div
                className={`text-lg font-semibold ${
                  application.status === 'client_confirmed' ? 'text-green-400' : 'text-amber-400'
                }`}
              >
                {application.status === 'client_confirmed' ? 'Confirmed by client' : 'Pending confirmation'}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="text-sm text-slate-400 mb-2">Client Access Link</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={clientLink}
                readOnly
                className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg text-sm"
              />
              <button
                onClick={copyClientLink}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-400 hover:to-cyan-400 transition-colors shadow-lg shadow-teal-500/20"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-white">Loan Offers</h2>
              <p className="text-sm text-slate-400 mt-1">
                {application.offers_released_at
                  ? `Released on ${new Date(application.offers_released_at).toLocaleString()}`
                  : 'Not yet released to client'}
              </p>
            </div>
            <div className="flex gap-2">
              {!showAddOffer && !application.offers_released_at && (
                <button
                  onClick={() => setShowAddOffer(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-400 hover:to-cyan-400 transition-colors shadow-lg shadow-teal-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Offers
                </button>
              )}
              {!application.offers_released_at && (offers.length > 0 || application.evvo_hash_id) && (
                <button
                  onClick={handleReleaseOffers}
                  disabled={releasing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-400 hover:to-emerald-400 transition-colors disabled:opacity-50 shadow-lg shadow-green-500/20"
                >
                  {releasing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Release to Client
                </button>
              )}
            </div>
          </div>

          {showAddOffer && (
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-white mb-2">Add EVVO Offers Link</h3>
              <p className="text-sm text-slate-400 mb-3">Paste the EVVO offers page link. This will be shown to the client when you release offers.</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={offersLinkInput}
                  onChange={(e) => setOffersLinkInput(e.target.value)}
                  placeholder="https://www.askevvofinancial.com/..."
                  className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg text-sm placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <button
                  onClick={handleSaveOffersLink}
                  disabled={savingLink || !offersLinkInput.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-400 hover:to-cyan-400 transition-colors disabled:opacity-50 shadow-lg shadow-teal-500/20"
                >
                  {savingLink ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setShowAddOffer(false); setOffersLinkInput(''); }}
                  className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* EVVO Offers Link */}
          {application.evvo_hash_id && (
            <div className="bg-slate-700/30 border border-teal-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <Link className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-slate-300">EVVO Offers Link</h4>
                  <a
                    href={application.evvo_hash_id}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:text-teal-300 text-sm break-all transition-colors"
                  >
                    {application.evvo_hash_id}
                  </a>
                </div>
                {!application.offers_released_at && (
                  <button
                    onClick={() => { setOffersLinkInput(application.evvo_hash_id || ''); setShowAddOffer(true); }}
                    className="px-3 py-1.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors text-sm"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          )}

          {!application.evvo_hash_id && offers.length === 0 && !showAddOffer && (
            <div className="text-center py-8 text-slate-400">
              No offers added yet. Click "Add Offers" to add an EVVO offers link.
            </div>
          )}

          {/* Manual Offers */}
          {offers.length > 0 && (
            <div className="space-y-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 hover:border-teal-500/50 hover:bg-slate-700/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{offer.lender_name}</h3>
                        <span className="text-xl font-black text-teal-400">{offer.apr}% APR</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <div className="text-slate-400">Loan Amount</div>
                          <div className="font-semibold text-slate-200">${offer.loan_amount.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Monthly Payment</div>
                          <div className="font-semibold text-slate-200">
                            ${offer.monthly_payment.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Term</div>
                          <div className="font-semibold text-slate-200">{offer.term_months} months</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Total Repayment</div>
                          <div className="font-semibold text-slate-200">
                            ${offer.total_repayment.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!application.offers_released_at && (
                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="ml-4 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-white">Financial Analysis</h2>
              <p className="text-sm text-slate-400 mt-1">
                {application.financial_analysis_released_at
                  ? `Released on ${new Date(application.financial_analysis_released_at).toLocaleString()}`
                  : 'Not yet released to client'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (application.financial_document_url) {
                    window.open(application.financial_document_url, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  alert('Financial report link is not available yet.');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-400 hover:to-cyan-400 transition-colors shadow-lg shadow-teal-500/20"
              >
                <FileText className="w-4 h-4" />
                View Document
              </button>
              {!application.financial_analysis_released_at && (
                <button
                  onClick={handleReleaseFinancialAnalysis}
                  disabled={releasing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-400 hover:to-emerald-400 transition-colors disabled:opacity-50 shadow-lg shadow-green-500/20"
                >
                  {releasing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Release to Client
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {application.financial_analysis_released_at ? (
              <>
                <Eye className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Visible to client</span>
              </>
            ) : (
              <>
                <EyeOff className="w-5 h-5 text-slate-400" />
                <span className="text-slate-400">Hidden from client</span>
              </>
            )}
          </div>

          <div className="mt-4 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
            <p className="text-sm text-slate-300">
              The financial analysis is part of the debt review document. Release it when you're ready
              for the client to view their complete financial breakdown.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
