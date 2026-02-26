import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle, ArrowRight, ExternalLink, Shield } from 'lucide-react';
import { LenderLogosAnimation } from '../components/LenderLogosAnimation';
import evvoLogo from '../assets/evvo_financial_logo.jpg';

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
  offers_released_at: string | null;
  financial_analysis_released_at: string | null;
  financial_document_url: string | null;
  offers_available: boolean;
  evvo_offers_data: EvvoOffersData | null;
  client_email: string;
  client_phone: string;
  ssn: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  review_id: string;
  debt_reviews: {
    client_name: string;
    credit_score: number;
    credit_tier: string;
    overall_credit_utilization: number;
    debt_to_income_ratio: number;
    own_estimated_term: string;
    own_estimated_total_payoff: number;
    own_estimated_savings: number;
    program_estimated_term: string;
    program_estimated_total_payoff: number;
    program_estimated_savings: number;
    program_monthly_payment: number;
  } | null;
}

export function ClientViewPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [offers, setOffers] = useState<LoanOffer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const initialLoadDone = useRef(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmStorageKey = token ? `client-confirmed:${token}` : null;

  const statusMessages = [
    'Checking for Offers',
    'Lenders are Reviewing',
    'Looking for Loan Options'
  ];

  const loadApplicationData = useCallback(async () => {
    if (!token) return;

    try {
      const { data: appData, error: appError } = await supabase
        .from('loan_applications')
        .select(`
          id,
          offers_released_at,
          financial_analysis_released_at,
          financial_document_url,
          offers_available,
          evvo_offers_data,
          client_email,
          client_phone,
          ssn,
          date_of_birth,
          street_address,
          city,
          state,
          zip,
          review_id,
          debt_reviews!loan_applications_review_id_fkey (
            client_name,
            credit_score,
            credit_tier,
            overall_credit_utilization,
            debt_to_income_ratio,
            own_estimated_term,
            own_estimated_total_payoff,
            own_estimated_savings,
            program_estimated_term,
            program_estimated_total_payoff,
            program_estimated_savings,
            program_monthly_payment
          )
        `)
        .eq('client_access_token', token)
        .maybeSingle();

      if (appError) throw appError;
      if (!appData) {
        if (!initialLoadDone.current) {
          setError('Application not found');
        }
        setLoading(false);
        return;
      }

      const normalizedDebtReview = Array.isArray(appData.debt_reviews)
        ? appData.debt_reviews[0] ?? null
        : appData.debt_reviews;

      setError(null);
      setApplication({
        ...appData,
        debt_reviews: normalizedDebtReview,
      } as Application);

      if (appData.offers_released_at || appData.financial_analysis_released_at) {
        setConfirmed(true);
      }

      if (appData.offers_released_at) {
        const { data: offersData, error: offersError } = await supabase
          .from('loan_offers')
          .select('*')
          .eq('application_id', appData.id)
          .order('apr', { ascending: true });

        if (offersError) throw offersError;
        setOffers(offersData || []);
      }

      initialLoadDone.current = true;
    } catch (err) {
      console.error('Error loading application:', err);
      if (!initialLoadDone.current) {
        setError('Failed to load application data');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Keep a ref that always points to the latest loadApplicationData
  const loadRef = useRef(loadApplicationData);
  useEffect(() => {
    loadRef.current = loadApplicationData;
  }, [loadApplicationData]);

  // Initial load
  useEffect(() => {
    loadApplicationData();
  }, [loadApplicationData]);

  // Restore confirmed state from localStorage
  useEffect(() => {
    if (!confirmStorageKey) return;
    if (window.localStorage.getItem(confirmStorageKey) === 'true') {
      setConfirmed(true);
    }
  }, [confirmStorageKey]);

  // Realtime listener
  useEffect(() => {
    if (!token) return;

    const channel = supabase
      .channel(`client-application-${token}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loan_applications',
          filter: `client_access_token=eq.${token}`,
        },
        () => {
          loadRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);

  // Polling fallback -- always poll while waiting for offers
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      loadRef.current();
    }, 3000);

    return () => clearInterval(interval);
  }, [token]);

  // Rotating status messages while waiting
  useEffect(() => {
    const released = application?.offers_released_at || application?.financial_analysis_released_at;
    if (confirmed && !released) {
      const statusInterval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % statusMessages.length);
      }, 3000);

      return () => clearInterval(statusInterval);
    }
  }, [confirmed, application?.offers_released_at, application?.financial_analysis_released_at]);

  async function handleConfirmAndContinue() {
    if (!application) return;

    setConfirming(true);
    setConfirmError(null);

    try {
      const response = await fetch(
        `${SUPABASE_BASE_URL}/functions/v1/confirm-client`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            application_id: application.id,
            client_access_token: token,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to confirm your information');
      }

      setConfirmed(true);
      if (confirmStorageKey) {
        window.localStorage.setItem(confirmStorageKey, 'true');
      }
    } catch (err) {
      setConfirmError(
        err instanceof Error ? err.message : 'Failed to confirm your information'
      );
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-teal-700 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Loading Your Application</h2>
          <p className="text-slate-600">Please wait while we retrieve your information...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600">{error || 'Application not found'}</p>
        </div>
      </div>
    );
  }

  const hasReleasedContent = application.offers_released_at || application.financial_analysis_released_at;

  if (!confirmed && !hasReleasedContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="flex items-center justify-center mb-6">
            <img src={evvoLogo} alt="EVVO" className="w-16 h-16 rounded-full" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 text-center">
            Confirm Your Information
          </h1>
          <p className="text-slate-600 text-center mb-8">
            Please review your information below before proceeding
          </p>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Full Name</div>
                <div className="text-lg font-semibold text-slate-900">
                  {application.debt_reviews?.client_name || 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Email Address</div>
                <div className="text-lg font-semibold text-slate-900">
                  {application.client_email || 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Phone Number</div>
                <div className="text-lg font-semibold text-slate-900">
                  {application.client_phone || 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">SSN</div>
                <div className="text-lg font-semibold text-slate-900">
                  {application.ssn || 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Date of Birth</div>
                <div className="text-lg font-semibold text-slate-900">
                  {application.date_of_birth ? new Date(application.date_of_birth).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 md:col-span-2">
                <div className="text-sm text-slate-600 mb-1">Street Address</div>
                <div className="text-lg font-semibold text-slate-900">
                  {application.street_address || 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">City</div>
                <div className="text-lg font-semibold text-slate-900">
                  {application.city || 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">State</div>
                <div className="text-lg font-semibold text-slate-900">
                  {application.state || 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 md:col-span-2">
                <div className="text-sm text-slate-600 mb-1">ZIP Code</div>
                <div className="text-lg font-semibold text-slate-900">
                  {application.zip || 'N/A'}
                </div>
              </div>
            </div>

            {confirmError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {confirmError}
              </div>
            )}

            <button
              onClick={handleConfirmAndContinue}
              disabled={confirming}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {confirming ? 'Confirming...' : 'Confirm and Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasReleasedContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <LenderLogosAnimation />
          <Loader2 className="w-12 h-12 text-teal-700 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-3">{statusMessages[statusIndex]}</h2>
          <p className="text-slate-600 mb-4">
            We're searching for the best loan offers for you.
          </p>
          <div className="bg-teal-50 rounded-lg p-4 mt-6 flex items-center justify-center gap-2">
            <p className="text-sm text-teal-800">
              Powered by EVVO
            </p>
            <img src={evvoLogo} alt="EVVO" className="w-6 h-6 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const evvoOffers = application.evvo_offers_data?.offers ?? [];
  const evvoCustomTiles = application.evvo_offers_data?.custom_tiles ?? [];
  const hasEvvoOffers = evvoOffers.length > 0;
  const hasCustomTiles = evvoCustomTiles.length > 0;
  const hasManualOffers = offers.length > 0;
  const hasAnyOffers = hasEvvoOffers || hasManualOffers;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
      <div className="max-w-6xl mx-auto py-8">

        {/* EVVO Offers */}
        {hasEvvoOffers && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <h2 className="text-2xl font-black text-slate-900">Your Loan Offers</h2>
                <p className="text-slate-600">We found {evvoOffers.length} offer{evvoOffers.length !== 1 ? 's' : ''} for you</p>
              </div>
            </div>

            <div className="space-y-4">
              {evvoOffers.map((offer) => (
                <div
                  key={offer.uuid}
                  className="border border-teal-200 rounded-xl p-6 hover:border-teal-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    {offer.originator_img_link && (
                      <img
                        src={offer.originator_img_link}
                        alt={offer.originator}
                        className="w-20 h-20 rounded-xl object-contain bg-slate-50 p-2 flex-shrink-0 border border-slate-100"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl font-bold text-slate-900">{offer.originator}</h3>
                          {offer.pre_approved === 1 && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                              <Shield className="w-3 h-3" />
                              Pre-Approved
                            </span>
                          )}
                          {offer.pre_qualified === 1 && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                              <Shield className="w-3 h-3" />
                              Pre-Qualified
                            </span>
                          )}
                        </div>
                        {offer.apr !== 'N/A' && (
                          <div className="text-right">
                            <div className="text-2xl font-black text-teal-700">{offer.apr}</div>
                            <div className="text-xs text-slate-500">APR</div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                        <div>
                          <div className="text-sm text-slate-500">Loan Amount</div>
                          <div className="text-lg font-bold text-slate-900">{offer.loan_amnt}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-500">Monthly Payment</div>
                          <div className="text-lg font-bold text-slate-900">{offer.monthly}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-500">Term</div>
                          <div className="text-lg font-bold text-slate-900">{offer.term}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-500">Type</div>
                          <div className="text-lg font-bold text-slate-900 capitalize">{offer.loan_type}</div>
                        </div>
                      </div>

                      {offer.continue_link && (
                        <div className="mt-4">
                          <a
                            href={offer.continue_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors shadow-md"
                          >
                            Continue with {offer.originator}
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      )}

                      {offer.originator_disclaimer && (
                        <p className="text-xs text-slate-400 mt-3 italic">{offer.originator_disclaimer}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Offers (backward compatible) */}
        {hasManualOffers && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <h2 className="text-2xl font-black text-slate-900">{hasEvvoOffers ? 'Additional Offers' : 'Your Loan Offers'}</h2>
                <p className="text-slate-600">We found {offers.length} offer{offers.length !== 1 ? 's' : ''} for you</p>
              </div>
            </div>
            <div className="space-y-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="border border-teal-200 rounded-xl p-6 hover:border-teal-400 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{offer.lender_name}</h3>
                      <p className="text-sm text-slate-600">Loan Amount: ${offer.loan_amount.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-teal-700">{offer.apr}%</div>
                      <div className="text-sm text-slate-600">APR</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                    <div>
                      <div className="text-sm text-slate-600">Monthly Payment</div>
                      <div className="text-lg font-bold text-slate-900">${offer.monthly_payment.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Term</div>
                      <div className="text-lg font-bold text-slate-900">{offer.term_months} months</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Total Repayment</div>
                      <div className="text-lg font-bold text-slate-900">${offer.total_repayment.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No offers at all */}
        {!hasAnyOffers && (
          <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 bg-red-100 rounded-full p-3">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-red-900 mb-2">No Offers Available</h2>
                <p className="text-red-800 text-lg">Unfortunately, we were unable to find any loan offers that match your current financial profile at this time.</p>
              </div>
            </div>
          </div>
        )}

        {/* EVVO Custom Tiles */}
        {hasCustomTiles && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Explore More Options</h2>
            <p className="text-slate-600 mb-6">Additional financial services that may help you</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evvoCustomTiles.map((tile) => (
                <div
                  key={tile.id}
                  className="border border-slate-200 rounded-xl p-6 hover:border-teal-300 hover:shadow-md transition-all"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{tile.tile_header}</h3>
                  <div
                    className="text-sm text-slate-600 mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: tile.tile_details }}
                  />
                  {tile.offer_url && (
                    <a
                      href={tile.offer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors"
                    >
                      Learn More
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Analysis / Pay Your Debt Faster */}
        {application.financial_analysis_released_at && (
          <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 rounded-3xl shadow-2xl p-12 mb-6">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 drop-shadow-lg">
                Pay Your Debt Faster
              </h2>

              <button
                onClick={() => {
                  if (application.financial_document_url) {
                    window.open(application.financial_document_url, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  alert('Financial report link is not available yet.');
                }}
                className="group relative px-10 py-4 bg-white text-teal-700 rounded-xl hover:bg-teal-50 transition-all duration-300 font-bold text-lg shadow-2xl hover:shadow-white/20 hover:scale-105 transform"
              >
                <span className="flex items-center gap-3">
                  Explore More
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400/0 via-white/20 to-teal-400/0 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
              </button>
            </div>
          </div>
        )}

        {/* Powered by EVVO footer */}
        <div className="flex items-center justify-center gap-2 py-4">
          <p className="text-sm text-slate-500">Powered by</p>
          <img src={evvoLogo} alt="EVVO" className="w-6 h-6 rounded-full" />
          <p className="text-sm font-semibold text-slate-600">EVVO Financial</p>
        </div>
      </div>
    </div>
  );
}
