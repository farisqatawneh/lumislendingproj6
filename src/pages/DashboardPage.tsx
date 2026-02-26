import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, FileText, LogOut, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import lumisLogo from '../assets/Lumis_Lending_Logo-removebg-preview.png';

interface Application {
  id: string;
  client_email: string;
  client_phone: string;
  status: string | null;
  submitted_at: string;
  review_id: string;
  debt_reviews: {
    client_name: string;
    credit_score: number;
  } | null;
}

export function DashboardPage() {
  const { rep, signOut } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    try {
      const { data, error } = await supabase
        .from('loan_applications')
        .select(`
          id,
          client_email,
          client_phone,
          status,
          submitted_at,
          review_id,
          debt_reviews!loan_applications_review_id_fkey (
            client_name,
            credit_score
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50">
      <nav className="bg-white border-b border-teal-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={lumisLogo} alt="Lumis Lending" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-black text-slate-900">Dashboard</h1>
              <p className="text-sm text-slate-600">{rep?.full_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/new-application')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Application
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900">Applications</h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-4 text-slate-600">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No applications found</h3>
              <p className="text-slate-600 mb-6">Get started by creating your first application</p>
              <button
                onClick={() => navigate('/new-application')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Application
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Client Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Credit Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Client Confirmation</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Submitted</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {app.debt_reviews?.client_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{app.client_email}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {app.debt_reviews?.credit_score || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            app.status === 'client_confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {app.status === 'client_confirmed' ? 'Confirmed' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(app.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate(`/rep-review/${app.review_id}`)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-colors text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
