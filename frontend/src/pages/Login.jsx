import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signIn } from '../services/firebase';
import { Activity, Lock, Mail, Loader2 } from 'lucide-react';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 bg-mesh relative overflow-hidden p-4">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-600/10 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-600/10 rounded-full blur-[100px] animate-float-delayed" />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 items-center justify-center shadow-glow mb-4">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            RMET Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Intelligent Multi-Tenant Sales Platform
          </p>
        </div>

        {/* Form Card */}
        <div className="card-glass border-white/10 relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="input-label">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="input-label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="alert-error animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-sm justify-center shadow-glow-sm hover:shadow-glow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-slate-500 mb-2">Demo Credentials</p>
            <div className="inline-block px-3 py-1.5 rounded-lg bg-white/3 border border-white/5 font-mono text-[11px] text-slate-400">
              admin@rmet.com / password123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
