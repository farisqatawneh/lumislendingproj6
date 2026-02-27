import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, FileText, LogOut, Eye, Settings, X, Loader2, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import lumisLogo from '../assets/Lumis_Lending_Logo-removebg-preview.png';

const ADMIN_EMAIL = 'george@lumislending.com';

interface RepUser {
  id: string;
  email: string;
  full_name: string;
  evvo_email: string | null;
  created_at: string;
}

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
  const [showSettings, setShowSettings] = useState(false);
  const [evvoEmail, setEvvoEmail] = useState('');
  const [evvoPassword, setEvvoPassword] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [savedEvvoEmail, setSavedEvvoEmail] = useState<string | null>(null);
  const [showCreateRep, setShowCreateRep] = useState(false);
  const [newRepEmail, setNewRepEmail] = useState('');
  const [newRepPassword, setNewRepPassword] = useState('');
  const [newRepName, setNewRepName] = useState('');
  const [creatingRep, setCreatingRep] = useState(false);
  const [repUsers, setRepUsers] = useState<RepUser[]>([]);
  const [showManageReps, setShowManageReps] = useState(false);

  const isAdmin = rep?.email === ADMIN_EMAIL;

  useEffect(() => {
    loadApplications();
    if (rep?.email === ADMIN_EMAIL) {
      loadReps();
    }
  }, [rep]);

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

  async function loadReps() {
    try {
      const { data, error } = await supabase
        .from('reps')
        .select('id, email, full_name, evvo_email, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRepUsers(data || []);
    } catch (error) {
      console.error('Error loading reps:', error);
    }
  }

  async function handleCreateRep(e: React.FormEvent) {
    e.preventDefault();
    if (!newRepEmail.trim() || !newRepPassword.trim() || !newRepName.trim()) return;

    setCreatingRep(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-rep', {
        body: {
          email: newRepEmail.trim(),
          password: newRepPassword.trim(),
          full_name: newRepName.trim(),
        },
      });

      if (error) throw new Error(error.message || 'Failed to create rep account');
      if (!data?.success) throw new Error(data?.error || 'Failed to create rep account');

      alert(`Account created for ${newRepEmail.trim()}`);
      setNewRepEmail('');
      setNewRepPassword('');
      setNewRepName('');
      setShowCreateRep(false);
      loadReps();
    } catch (err) {
      console.error('Error creating rep:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create account';
      if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        alert(`${msg}\n\nIf the create-rep function is not deployed, run:\nsupabase functions deploy create-rep`);
      } else {
        alert(msg);
      }
    } finally {
      setCreatingRep(false);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  async function handleSaveEvvoCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!rep?.id || !evvoEmail.trim() || !evvoPassword.trim()) return;

    setSavingCredentials(true);
    try {
      const { error } = await supabase
        .from('reps')
        .update({ evvo_email: evvoEmail.trim(), evvo_password: evvoPassword.trim() })
        .eq('id', rep.id);

      if (error) throw error;
      setSavedEvvoEmail(evvoEmail.trim());
      setShowSettings(false);
      setEvvoPassword('');
      alert('EVVO credentials saved successfully!');
    } catch (err) {
      console.error('Error saving EVVO credentials:', err);
      alert(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setSavingCredentials(false);
    }
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
            {isAdmin && (
              <button
                onClick={() => setShowManageReps(!showManageReps)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                Manage Reps
              </button>
            )}
            <button
              onClick={() => { setEvvoEmail(savedEvvoEmail || rep?.evvo_email || ''); setEvvoPassword(''); setShowSettings(true); }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              {(savedEvvoEmail || rep?.evvo_email) ? 'EVVO Settings' : 'Setup EVVO'}
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
        {isAdmin && showManageReps && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900">Manage Reps</h2>
              <button
                onClick={() => setShowCreateRep(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Create New Rep
              </button>
            </div>

            {showCreateRep && (
              <form onSubmit={handleCreateRep} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-slate-900 mb-4">Create New Rep Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newRepName}
                      onChange={(e) => setNewRepName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={newRepEmail}
                      onChange={(e) => setNewRepEmail(e.target.value)}
                      placeholder="rep@lumislending.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newRepPassword}
                      onChange={(e) => setNewRepPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    type="submit"
                    disabled={creatingRep}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-colors disabled:opacity-50"
                  >
                    {creatingRep ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {creatingRep ? 'Creating...' : 'Create Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateRep(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">EVVO Account</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {repUsers.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">{r.full_name}</td>
                      <td className="py-3 px-4 text-slate-600">{r.email}</td>
                      <td className="py-3 px-4">
                        {r.evvo_email ? (
                          <span className="inline-flex items-center gap-1 text-green-700 text-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            {r.evvo_email}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">Not configured</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {repUsers.length === 0 && (
                <p className="text-center py-6 text-slate-400">No reps found</p>
              )}
            </div>
          </div>
        )}

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

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900">EVVO Account Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Enter your personal EVVO Financial credentials. Each rep uses their own EVVO account so leads and customers are tracked separately.
            </p>
            {(savedEvvoEmail || rep?.evvo_email) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800">
                  Currently connected as <strong>{savedEvvoEmail || rep?.evvo_email}</strong>
                </p>
              </div>
            )}
            <form onSubmit={handleSaveEvvoCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">EVVO Email</label>
                <input
                  type="email"
                  required
                  value={evvoEmail}
                  onChange={(e) => setEvvoEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">EVVO Password</label>
                <input
                  type="password"
                  required
                  value={evvoPassword}
                  onChange={(e) => setEvvoPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingCredentials || !evvoEmail.trim() || !evvoPassword.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-colors disabled:opacity-50"
                >
                  {savingCredentials ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {savingCredentials ? 'Saving...' : 'Save Credentials'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
