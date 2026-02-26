import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Eye, EyeOff, Send, Plus, Trash2, Loader2, FileText, Download, ExternalLink } from 'lucide-react';

const SUPABASE_BASE_URL = 'https://obupjgavowabowrshtmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9idXBqZ2F2b3dhYm93cnNodG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTY0MzMsImV4cCI6MjA4NTk3MjQzM30.6M8_Q_wYnM1lUtwx3Gt7PZE3m6IAzqF5gc3WEJt26bE';

interface LoanOffer {
  id: string;
  lender_name: string;
  loan_amount: number;
  apr: number;
  term_months: number;
  monthly_payment: number;
  total_repayment: number;
}

interface EvvoOffer {
  uuid: string;
  originator: string;
  originator_img_link: string;
  originator_disclaimer: string;
  term: string;
  apr: string;
  monthly: string;
  loan_amnt: string;
  loan_type: string;
  pre_approved: number;
  pre_qualified: number;
  continue_link: string;
}

interface EvvoCustomTile {
  id: number;
  company_id: string;
  tile_name: string;
  offer_url: string;
  tile_header: string;
  tile_details: string;
}

interface EvvoOffersData {
  customer_id: number;
  uuid: string;
  offers: EvvoOffer[];
  custom_tiles: EvvoCustomTile[];
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
  evvo_offers_data: EvvoOffersData | null;
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
  const [newOffer, setNewOffer] = useState({
    lender_name: '',
    loan_amount: '',
    apr: '',
    term_months: '',
    monthly_payment: '',
    total_repayment: '',
  });
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [fetchingOffers, setFetchingOffers] = useState(false);
  const [hashIdInput, setHashIdInput] = useState('');
  const [savingHashId, setSavingHashId] = useState(false);

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
          evvo_offers_data,
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

  async function handleAddOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!application) return;

    try {
      const { error } = await supabase.from('loan_offers').insert({
        application_id: application.id,
        lender_name: newOffer.lender_name,
        loan_amount: parseFloat(newOffer.loan_amount),
        apr: parseFloat(newOffer.apr),
        term_months: parseInt(newOffer.term_months),
        monthly_payment: parseFloat(newOffer.monthly_payment),
        total_repayment: parseFloat(newOffer.total_repayment),
      });

      if (error) throw error;

      await supabase
        .from('loan_applications')
        .update({ offers_available: true })
        .eq('id', application.id);

      setNewOffer({
        lender_name: '',
        loan_amount: '',
        apr: '',
        term_months: '',
        monthly_payment: '',
        total_repayment: '',
      });
      setShowAddOffer(false);
      loadData();
    } catch (err) {
      console.error('Error adding offer:', err);
      alert('Failed to add offer');
    }
  }

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

  async function handleSaveHashId() {
    if (!application || !hashIdInput.trim()) return;

    setSavingHashId(true);
    try {
      const { error } = await supabase
        .from('loan_applications')
        .update({ evvo_hash_id: hashIdInput.trim() })
        .eq('id', application.id);

      if (error) throw new Error(error.message);
      setHashIdInput('');
      loadData();
    } catch (err) {
      console.error('Error saving EVVO hash ID:', err);
      alert(err instanceof Error ? err.message : 'Failed to save EVVO hash ID');
    } finally {
      setSavingHashId(false);
    }
  }

  async function handleFetchEvvoOffers() {
    if (!application?.evvo_hash_id) return;

    setFetchingOffers(true);
    try {
      const response = await fetch(
        `${SUPABASE_BASE_URL}/functions/v1/fetch-evvo-offers`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ application_id: application.id }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to fetch offers from EVVO');
      }

      console.log('EVVO raw response:', JSON.stringify(data, null, 2));
      alert(`EVVO returned: ${data.offers_count ?? 0} offers, ${data.custom_tiles_count ?? 0} custom tiles.\n\nRaw keys: ${Object.keys(data.data ?? {}).join(', ')}\n\nFull response logged to console (F12).`);

      loadData();
    } catch (err) {
      console.error('Error fetching EVVO offers:', err);
      alert(err instanceof Error ? err.message : 'Failed to fetch EVVO offers');
    } finally {
      setFetchingOffers(false);
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

        {/* EVVO Hash ID */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">EVVO Integration</h2>
          <p className="text-sm text-slate-400 mb-3">
            {application.evvo_hash_id
              ? 'Update the EVVO hash ID if needed.'
              : 'Enter the EVVO hash ID to fetch loan offers. You can find this on the EVVO dashboard after validating the client\'s SSN.'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={hashIdInput}
              onChange={(e) => setHashIdInput(e.target.value)}
              placeholder={application.evvo_hash_id || 'Paste EVVO hash ID here...'}
              className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg text-sm placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <button
              onClick={handleSaveHashId}
              disabled={savingHashId || !hashIdInput.trim()}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:from-violet-400 hover:to-purple-400 transition-colors disabled:opacity-50 shadow-lg shadow-violet-500/20"
            >
              {savingHashId ? 'Saving...' : 'Save'}
            </button>
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
              {application.evvo_hash_id && !application.evvo_offers_data && (
                <button
                  onClick={handleFetchEvvoOffers}
                  disabled={fetchingOffers}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:from-violet-400 hover:to-purple-400 transition-colors disabled:opacity-50 shadow-lg shadow-violet-500/20"
                >
                  {fetchingOffers ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {fetchingOffers ? 'Fetching...' : 'Fetch Offers from EVVO'}
                </button>
              )}
              {application.evvo_hash_id && application.evvo_offers_data && (
                <button
                  onClick={handleFetchEvvoOffers}
                  disabled={fetchingOffers}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                >
                  {fetchingOffers ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Refresh EVVO Offers
                </button>
              )}
              {!showAddOffer && !application.offers_released_at && (
                <button
                  onClick={() => setShowAddOffer(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-400 hover:to-cyan-400 transition-colors shadow-lg shadow-teal-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Offer
                </button>
              )}
              {!application.offers_released_at && (offers.length > 0 || application.evvo_offers_data) && (
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
            <form onSubmit={handleAddOffer} className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-white mb-4">Add New Offer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Lender Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newOffer.lender_name}
                    onChange={(e) => setNewOffer({ ...newOffer, lender_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Loan Amount
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newOffer.loan_amount}
                    onChange={(e) => setNewOffer({ ...newOffer, loan_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">APR (%)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newOffer.apr}
                    onChange={(e) => setNewOffer({ ...newOffer, apr: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Term (months)
                  </label>
                  <input
                    type="number"
                    required
                    value={newOffer.term_months}
                    onChange={(e) => setNewOffer({ ...newOffer, term_months: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Monthly Payment
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newOffer.monthly_payment}
                    onChange={(e) => setNewOffer({ ...newOffer, monthly_payment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Total Repayment
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newOffer.total_repayment}
                    onChange={(e) => setNewOffer({ ...newOffer, total_repayment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-400 hover:to-cyan-400 transition-colors shadow-lg shadow-teal-500/20"
                >
                  Add Offer
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddOffer(false)}
                  className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* EVVO Offers */}
          {application.evvo_offers_data && (
            <>
              <h3 className="text-lg font-bold text-white mb-3">EVVO Offers</h3>
              <div className="space-y-3 mb-6">
                {application.evvo_offers_data.offers?.map((offer) => (
                  <div
                    key={offer.uuid}
                    className="bg-slate-700/30 border border-violet-500/30 rounded-lg p-4 hover:border-violet-500/50 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {offer.originator_img_link && (
                        <img
                          src={offer.originator_img_link}
                          alt={offer.originator}
                          className="w-16 h-16 rounded-lg object-contain bg-white p-1 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className="text-lg font-bold text-white">{offer.originator}</h4>
                          {offer.apr !== 'N/A' && (
                            <span className="text-lg font-black text-violet-400">{offer.apr} APR</span>
                          )}
                          {offer.pre_approved === 1 && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">Pre-Approved</span>
                          )}
                          {offer.pre_qualified === 1 && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">Pre-Qualified</span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-600/50 text-slate-300 text-xs rounded-full capitalize">{offer.loan_type}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-slate-400">Loan Amount</div>
                            <div className="font-semibold text-slate-200">{offer.loan_amnt}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Monthly</div>
                            <div className="font-semibold text-slate-200">{offer.monthly}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Term</div>
                            <div className="font-semibold text-slate-200">{offer.term}</div>
                          </div>
                          {offer.continue_link && (
                            <div className="flex items-end">
                              <a
                                href={offer.continue_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Continue Link
                              </a>
                            </div>
                          )}
                        </div>
                        {offer.originator_disclaimer && (
                          <p className="text-xs text-slate-500 mt-2 italic">{offer.originator_disclaimer}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {application.evvo_offers_data.custom_tiles?.length > 0 && (
                <>
                  <h3 className="text-lg font-bold text-white mb-3">Additional Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {application.evvo_offers_data.custom_tiles.map((tile) => (
                      <div
                        key={tile.id}
                        className="bg-slate-700/30 border border-cyan-500/30 rounded-lg p-4 hover:border-cyan-500/50 transition-all"
                      >
                        <h4 className="text-md font-bold text-white mb-2">{tile.tile_header}</h4>
                        <div
                          className="text-sm text-slate-300 mb-3 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-1"
                          dangerouslySetInnerHTML={{ __html: tile.tile_details }}
                        />
                        {tile.offer_url && (
                          <a
                            href={tile.offer_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Visit
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Raw data fallback when EVVO response doesn't match expected structure */}
              {!(application.evvo_offers_data.offers?.length > 0) && !(application.evvo_offers_data.custom_tiles?.length > 0) && (
                <div className="bg-slate-700/30 border border-amber-500/30 rounded-lg p-4 mb-6">
                  <h4 className="text-md font-bold text-amber-400 mb-2">EVVO Response (raw data)</h4>
                  <p className="text-sm text-slate-400 mb-2">Response keys: {Object.keys(application.evvo_offers_data).join(', ')}</p>
                  <pre className="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap bg-slate-800/50 rounded p-3 max-h-96 overflow-y-auto">
                    {JSON.stringify(application.evvo_offers_data, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}

          {!application.evvo_offers_data && !application.evvo_hash_id && offers.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No offers added yet. Click "Add Offer" to create one.
            </div>
          )}

          {!application.evvo_offers_data && application.evvo_hash_id && offers.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No offers fetched yet. Click "Fetch Offers from EVVO" to retrieve them.
            </div>
          )}

          {/* Manual Offers */}
          {offers.length > 0 && (
            <>
              {application.evvo_offers_data && (
                <h3 className="text-lg font-bold text-white mb-3">Manual Offers</h3>
              )}
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
            </>
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
