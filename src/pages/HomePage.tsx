import lumisLogo from '../assets/lumis_lending_logo-removebg-preview.png';

export const HomePage = () => {
  const webhookUrl = 'https://obupjgavowabowrshtmt.supabase.co/functions/v1/debt-review-webhook';

  const examplePayload = {
    client_name: "John Doe",
    review_date: "2026-02-08",
    credit_score: 650,
    credit_tier: "Fair",
    overall_credit_utilization: 75.5,
    debt_to_income_ratio: 42.3,
    own_estimated_term: "5-7 years",
    own_estimated_total_payoff: 45000,
    own_estimated_savings: 0,
    program_estimated_term: "2-4 years",
    program_estimated_total_payoff: 27000,
    program_estimated_savings: 18000,
    debt_items: [
      {
        creditor: "Chase Bank",
        account_type: "Credit Card",
        balance: 8500,
        apr: 22.99,
        utilization: 85,
        est_interest_paid: 3200,
        est_payoff_time: "4-5 years"
      },
      {
        creditor: "Capital One",
        account_type: "Credit Card",
        balance: 5200,
        apr: 19.99,
        utilization: 90,
        est_interest_paid: 1800,
        est_payoff_time: "4 years"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src={lumisLogo} alt="Lumis Lending" className="h-20 w-auto" />
          </div>
          <h1 className="text-4xl font-bold text-teal-900 mb-2">Debt Review Document System</h1>
          <p className="text-xl text-teal-700 mb-6">
            Professional client-facing debt analysis reports with CRM webhook integration
          </p>
          <a
            href="/sample"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/sample');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-6 py-3 rounded-lg shadow-lg transition-all transform hover:scale-105 font-semibold"
          >
            View Sample Document
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-teal-600">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Webhook Integration</h3>
            <p className="text-slate-600">
              Connect your CRM to automatically generate professional debt review documents
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-cyan-600">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Beautiful Documents</h3>
            <p className="text-slate-600">
              Production-ready designs optimized for client presentations and printing
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-teal-500">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Instant Generation</h3>
            <p className="text-slate-600">
              Documents are created instantly and accessible via unique shareable links
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">API Documentation</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Webhook Endpoint</h3>
              <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                POST {webhookUrl}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Authentication</h3>
              <p className="text-slate-600 mb-2">No authentication required for webhook endpoint.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Request Body Example</h3>
              <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(examplePayload, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Response Example</h3>
              <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "review_id": "123e4567-e89b-12d3-a456-426614174000",
  "document_url": "${window.location.origin}/review/123e4567-e89b-12d3-a456-426614174000",
  "message": "Debt review created successfully"
}`}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Field Descriptions</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-4 py-2 text-left font-semibold text-slate-900 border">Field</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-900 border">Type</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-900 border">Required</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-900 border">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 border font-mono text-sm">client_name</td>
                      <td className="px-4 py-2 border">string</td>
                      <td className="px-4 py-2 border">Yes</td>
                      <td className="px-4 py-2 border">Client's full name</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="px-4 py-2 border font-mono text-sm">debt_items</td>
                      <td className="px-4 py-2 border">array</td>
                      <td className="px-4 py-2 border">Yes</td>
                      <td className="px-4 py-2 border">Array of debt items (minimum 1)</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border font-mono text-sm">credit_score</td>
                      <td className="px-4 py-2 border">number</td>
                      <td className="px-4 py-2 border">No</td>
                      <td className="px-4 py-2 border">Credit score (300-850)</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="px-4 py-2 border font-mono text-sm">credit_tier</td>
                      <td className="px-4 py-2 border">string</td>
                      <td className="px-4 py-2 border">No</td>
                      <td className="px-4 py-2 border">Poor / Fair / Good / Very Good / Exceptional</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to integrate?</h2>
          <p className="text-lg mb-6">
            Connect your CRM to start generating professional debt review documents instantly
          </p>
          <div className="text-teal-100">
            <span>Send a POST request to the webhook endpoint</span>
          </div>
        </div>
      </div>
    </div>
  );
};
