import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Search, Save, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SUPABASE_BASE_URL = 'https://obupjgavowabowrshtmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9idXBqZ2F2b3dhYm93cnNodG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTY0MzMsImV4cCI6MjA4NTk3MjQzM30.6M8_Q_wYnM1lUtwx3Gt7PZE3m6IAzqF5gc3WEJt26bE';

interface CRMData {
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  ssn: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  credit_score: number;
  credit_tier: string;
  overall_credit_utilization: number;
  debt_to_income_ratio: number;
  own_estimated_term: string;
  own_estimated_total_payoff: number;
  own_estimated_savings: number;
  program_estimated_term: string;
  program_estimated_total_payoff: number;
  program_monthly_payment: number;
  debt_items: Array<{
    creditor: string;
    account_type: string;
    balance: number;
    apr: number;
    utilization: number;
    minimum_payment: number;
    est_interest_paid: number;
    est_payoff_time: string;
  }>;
}

export function ApplicationForm() {
  const { rep, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [loading, setLoading] = useState(false);
  const [fetchingCRM, setFetchingCRM] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [clientId, setClientId] = useState('');
  const [crmData, setCrmData] = useState<CRMData | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [cellPhone, setCellPhone] = useState('');
  const [homePhone, setHomePhone] = useState('');
  const [ssn, setSsn] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [providedCreditRating, setProvidedCreditRating] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [payFrequency, setPayFrequency] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [propertyStatus, setPropertyStatus] = useState('');

  async function fetchClientFromCRM() {
    if (!clientId.trim()) {
      setError('Please enter a Client ID');
      return;
    }

    setFetchingCRM(true);
    setError('');

    try {
      const apiUrl = `${SUPABASE_BASE_URL}/functions/v1/fetch-crm-client`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: clientId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const details = result?.details ? ` - ${JSON.stringify(result.details)}` : '';
        throw new Error((result.error || 'Failed to fetch client data from CRM') + details);
      }

      setCrmData(result.data);
      setClientName(result.data.client_name);
      setClientEmail(result.data.client_email);

      // Format phone as (AAA) BBB-SSSS
      const rawPhone = result.data.client_phone.replace(/\D/g, '');
      const formattedPhone = rawPhone.length === 10
        ? `(${rawPhone.slice(0, 3)}) ${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`
        : result.data.client_phone;
      setClientPhone(formattedPhone);

      // Format SSN as AAA-GG-SSSS
      const rawSsn = result.data.ssn.replace(/\D/g, '');
      const formattedSsn = rawSsn.length === 9
        ? `${rawSsn.slice(0, 3)}-${rawSsn.slice(3, 5)}-${rawSsn.slice(5)}`
        : result.data.ssn;
      setSsn(formattedSsn);

      setDateOfBirth(result.data.date_of_birth);
      setStreetAddress(result.data.street_address);
      setCity(result.data.city);
      setState(result.data.state);
      setZip(result.data.zip);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch client data');
    } finally {
      setFetchingCRM(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!crmData) {
      setError('Please fetch a client before submitting');
      return;
    }

    if (!user) {
      setError('Please sign in again and try submitting');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let repId = rep?.id;

      // Some existing auth users may not have a corresponding reps row yet.
      // Create it on demand to avoid "submit button does nothing" behavior.
      if (!repId) {
        const fallbackFullName =
          (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
          (user.email?.split('@')[0] ?? 'Rep');

        const { data: createdRep, error: repInsertError } = await supabase
          .from('reps')
          .upsert(
            {
              id: user.id,
              email: user.email ?? `${user.id}@placeholder.local`,
              full_name: fallbackFullName,
            },
            { onConflict: 'id' }
          )
          .select('id')
          .single();

        if (repInsertError) {
          throw new Error(`Failed to create rep profile: ${repInsertError.message}`);
        }

        repId = createdRep.id;
      }

      const evvoApiUrl = `${SUPABASE_BASE_URL}/functions/v1/submit-evvo-lead`;
      const evvoResponse = await fetch(evvoApiUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rep_id: repId,
          client_id: clientId,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          cell_phone: cellPhone || clientPhone,
          home_phone: homePhone || clientPhone,
          ssn: ssn,
          date_of_birth: dateOfBirth,
          street_address: streetAddress,
          city: city,
          state: state,
          zip: zip,
          loan_purpose: loanPurpose || null,
          loan_amount: loanAmount ? parseFloat(loanAmount) : null,
          provided_credit_rating: providedCreditRating || null,
          employment_status: employmentStatus || null,
          pay_frequency: payFrequency || null,
          annual_income: annualIncome ? parseFloat(annualIncome) : null,
          education_level: educationLevel || null,
          property_status: propertyStatus || null,
          evvo_agent_email: user.email || null,
        }),
      });

      const evvoResult = await evvoResponse.json().catch(() => ({}));
      if (!evvoResponse.ok || !evvoResult?.success) {
        throw new Error(
          `Failed to submit application to EVVO: ${evvoResult?.error || 'Unknown EVVO error'}`
        );
      }

      const evvoData = evvoResult.data ?? {};
      const evvoHashId: string | null =
        evvoData.hash_id ?? evvoData.hash ?? evvoData.uuid ?? evvoData.id ?? evvoData.customer_id ?? null;
      console.log('EVVO lead response:', evvoData, '→ hash_id:', evvoHashId);

      const programEstimatedSavings = crmData.own_estimated_total_payoff - crmData.program_estimated_total_payoff;

      const { data: reviewData, error: reviewError } = await supabase
        .from('debt_reviews')
        .insert({
          rep_id: repId,
          client_name: clientName,
          credit_score: crmData.credit_score,
          credit_tier: crmData.credit_tier,
          overall_credit_utilization: crmData.overall_credit_utilization,
          debt_to_income_ratio: crmData.debt_to_income_ratio,
          own_estimated_term: crmData.own_estimated_term,
          own_estimated_total_payoff: crmData.own_estimated_total_payoff,
          own_estimated_savings: crmData.own_estimated_savings,
          program_estimated_term: crmData.program_estimated_term,
          program_estimated_total_payoff: crmData.program_estimated_total_payoff,
          program_estimated_savings: programEstimatedSavings,
          program_monthly_payment: crmData.program_monthly_payment,
        })
        .select()
        .single();

      if (reviewError) {
        console.error('Review creation error:', reviewError);
        throw new Error(`Failed to create review: ${reviewError.message}`);
      }

      const debtItemsToInsert = crmData.debt_items.map((item) => ({
        review_id: reviewData.id,
        creditor: item.creditor,
        account_type: item.account_type,
        balance: item.balance,
        apr: item.apr,
        utilization: item.utilization,
        minimum_payment: item.minimum_payment,
        est_interest_paid: item.est_interest_paid,
        est_payoff_time: item.est_payoff_time,
      }));

      if (debtItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('debt_items').insert(debtItemsToInsert);

        if (itemsError) {
          console.error('Debt items creation error:', itemsError);
          throw new Error(`Failed to create debt items: ${itemsError.message}`);
        }
      }

      const { data: applicationData, error: appError } = await supabase
        .from('loan_applications')
        .insert({
          rep_id: repId,
          review_id: reviewData.id,
          client_id: clientId,
          client_email: clientEmail,
          client_phone: clientPhone,
          cell_phone: cellPhone || null,
          home_phone: homePhone || null,
          ssn: ssn.replace(/\D/g, ''),
          date_of_birth: dateOfBirth,
          street_address: streetAddress,
          city: city,
          state: state,
          zip: zip,
          loan_purpose: loanPurpose || null,
          loan_amount: loanAmount ? parseFloat(loanAmount) : null,
          provided_credit_rating: providedCreditRating || null,
          employment_status: employmentStatus || null,
          pay_frequency: payFrequency || null,
          annual_income: annualIncome ? parseFloat(annualIncome) : null,
          education_level: educationLevel || null,
          property_status: propertyStatus || null,
          evvo_hash_id: evvoHashId ? String(evvoHashId) : null,
          status: 'pending',
        })
        .select()
        .single();

      if (appError) {
        console.error('Application creation error:', appError);
        throw new Error(`Failed to create application: ${appError.message}`);
      }

      const webhookApiUrl = `${SUPABASE_BASE_URL}/functions/v1/generate-financial-report`;
      const webhookResponse = await fetch(webhookApiUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: applicationData.id,
          review_id: reviewData.id,
          client_id: clientId,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          cell_phone: cellPhone || clientPhone,
          home_phone: homePhone || clientPhone,
          ssn: ssn.replace(/\D/g, ''),
          date_of_birth: dateOfBirth,
          street_address: streetAddress,
          city,
          state,
          zip,
          loan_purpose: loanPurpose || null,
          loan_amount: loanAmount ? parseFloat(loanAmount) : null,
          provided_credit_rating: providedCreditRating || null,
          employment_status: employmentStatus || null,
          pay_frequency: payFrequency || null,
          annual_income: annualIncome ? parseFloat(annualIncome) : null,
          education_level: educationLevel || null,
          property_status: propertyStatus || null,
          crm_data: crmData,
        }),
      });

      const webhookResult = await webhookResponse.json().catch(() => ({}));
      if (!webhookResponse.ok || !webhookResult?.success || !webhookResult?.report_url) {
        throw new Error(
          `Failed to generate financial report: ${webhookResult?.error || 'Missing report URL'}`
        );
      }

      const { error: reportUrlUpdateError } = await supabase
        .from('loan_applications')
        .update({ financial_document_url: webhookResult.report_url })
        .eq('id', applicationData.id);

      if (reportUrlUpdateError) {
        throw new Error(`Failed to save financial report URL: ${reportUrlUpdateError.message}`);
      }

      const { error: updateError } = await supabase
        .from('debt_reviews')
        .update({ application_id: applicationData.id })
        .eq('id', reviewData.id);

      if (updateError) {
        console.error('Review update error:', updateError);
        throw new Error(`Failed to update review: ${updateError.message}`);
      }

      const clientLink = `${window.location.origin}/client/${applicationData.client_access_token}`;

      try {
        const emailApiUrl = `${SUPABASE_BASE_URL}/functions/v1/send-client-email`;
        await fetch(emailApiUrl, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: clientEmail,
            client_name: clientName,
            client_link: clientLink,
          }),
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep('input');
    setCrmData(null);
    setError('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-3 rounded-xl shadow-lg shadow-teal-500/30">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">New Application</h1>
              <p className="text-slate-400">
                {step === 'input'
                  ? 'Enter the client ID to fetch data from CRM'
                  : 'Review and edit client information'}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-6">
              Application submitted successfully! Redirecting to dashboard...
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Client ID *
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchClientFromCRM()}
                    placeholder="Enter CRM Client ID"
                    className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-lg placeholder-slate-400"
                    disabled={fetchingCRM}
                  />
                  <button
                    type="button"
                    onClick={fetchClientFromCRM}
                    disabled={fetchingCRM || !clientId.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {fetchingCRM ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Fetch
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Insert Client ID without FCDR
                </p>
              </div>

            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 text-teal-400 hover:text-teal-300 font-medium mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Client ID
                </button>

                <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">Client ID:</span> {clientId}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mb-4">Client Information</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Client Email *
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Client Phone
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        let formatted = digits;
                        if (digits.length >= 7) {
                          formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                        } else if (digits.length >= 4) {
                          formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                        } else if (digits.length >= 1) {
                          formatted = `(${digits}`;
                        }
                        setClientPhone(formatted);
                      }}
                      maxLength={14}
                      placeholder="(123) 456-7890"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        SSN *
                      </label>
                      <input
                        type="text"
                        value={ssn}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                          let formatted = digits;
                          if (digits.length >= 4) {
                            formatted = `${digits.slice(0, 3)}-${digits.slice(3, 5)}${digits.length > 5 ? `-${digits.slice(5)}` : ''}`;
                          } else if (digits.length >= 2) {
                            formatted = `${digits.slice(0, 3)}${digits.length > 3 ? `-${digits.slice(3)}` : ''}`;
                          }
                          setSsn(formatted);
                        }}
                        maxLength={11}
                        required
                        placeholder="123-45-6789"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                        maxLength={2}
                        required
                        placeholder="CA"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={zip}
                        onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        maxLength={5}
                        required
                        placeholder="90001"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mb-4">Loan Application</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Cell Phone
                      </label>
                      <input
                        type="tel"
                        value={cellPhone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          let formatted = digits;
                          if (digits.length >= 7) {
                            formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                          } else if (digits.length >= 4) {
                            formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                          } else if (digits.length >= 1) {
                            formatted = `(${digits}`;
                          }
                          setCellPhone(formatted);
                        }}
                        maxLength={14}
                        placeholder="(123) 456-7890"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Home Phone
                      </label>
                      <input
                        type="tel"
                        value={homePhone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          let formatted = digits;
                          if (digits.length >= 7) {
                            formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                          } else if (digits.length >= 4) {
                            formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                          } else if (digits.length >= 1) {
                            formatted = `(${digits}`;
                          }
                          setHomePhone(formatted);
                        }}
                        maxLength={14}
                        placeholder="(123) 456-7890"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Loan Purpose
                      </label>
                      <select
                        value={loanPurpose}
                        onChange={(e) => setLoanPurpose(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                      >
                        <option value="">--Select--</option>
                        <option value="auto">Auto</option>
                        <option value="business">Business</option>
                        <option value="cosmetic">Cosmetic</option>
                        <option value="credit_card_refinance">Credit Card Refinance</option>
                        <option value="debt_consolidation">Debt Consolidation</option>
                        <option value="emergency">Emergency</option>
                        <option value="green">Green</option>
                        <option value="home_improvement">Home Improvement</option>
                        <option value="household_expenses">Household Expenses</option>
                        <option value="large_purchases">Large Purchases</option>
                        <option value="life_event">Life Event</option>
                        <option value="medical_dental">Medical / Dental</option>
                        <option value="moving_relocation">Moving / Relocation</option>
                        <option value="student_loan_refinance">Student Loan Refinance</option>
                        <option value="taxes">Taxes</option>
                        <option value="vacation">Vacation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-1">
                        Loan Amount
                        <span className="text-xs text-slate-500" title="Requested loan amount">ⓘ</span>
                      </label>
                      <input
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-1">
                        Provided Credit Rating
                        <span className="text-xs text-slate-500" title="Client's self-reported credit rating">ⓘ</span>
                      </label>
                      <select
                        value={providedCreditRating}
                        onChange={(e) => setProvidedCreditRating(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                      >
                        <option value="">--Select--</option>
                        <option value="excellent">Excellent (720-850)</option>
                        <option value="good">Good (660-719)</option>
                        <option value="fair">Fair (601-659)</option>
                        <option value="low">Low (600 and under)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Employment Status
                      </label>
                      <select
                        value={employmentStatus}
                        onChange={(e) => setEmploymentStatus(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                      >
                        <option value="">--Select--</option>
                        <option value="employed">Employed</option>
                        <option value="military">Military</option>
                        <option value="not_employed">Not Employed</option>
                        <option value="retired">Retired</option>
                        <option value="self_employed">Self Employed</option>
                        <option value="student">Student</option>
                        <option value="pension">Pension</option>
                        <option value="disability">Disability</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Pay Frequency
                      </label>
                      <select
                        value={payFrequency}
                        onChange={(e) => setPayFrequency(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                      >
                        <option value="">--Select--</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="twice_per_month">Twice per month</option>
                        <option value="once_per_month">Once per month</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-1">
                        Annual Income
                        <span className="text-xs text-slate-500" title="Gross annual income">ⓘ</span>
                      </label>
                      <input
                        type="number"
                        value={annualIncome}
                        onChange={(e) => setAnnualIncome(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Education Level
                      </label>
                      <select
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                      >
                        <option value="">--Select--</option>
                        <option value="masters">Masters</option>
                        <option value="high_school_diploma">High School Diploma</option>
                        <option value="associate_degree">Associate's Degree</option>
                        <option value="bachelor_degree">Bachelor's Degree</option>
                        <option value="other_graduate_degree">Other Graduate Degree</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Property Status
                      </label>
                      <select
                        value={propertyStatus}
                        onChange={(e) => setPropertyStatus(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                      >
                        <option value="">--Select--</option>
                        <option value="own_with_mortgage">Own With Mortgage</option>
                        <option value="own">Own</option>
                        <option value="rent">Rent</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold py-3 rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
