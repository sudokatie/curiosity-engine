/**
 * Authentication Form Component - Dispatch-inspired design
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { getAuthStatus } from '../../api/auth';
import type { AuthStatus } from '../../api/auth';

export function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus | null>(null);
  
  const { login, signup, isLoading, error, clearError } = useAuthStore();

  useEffect(() => {
    getAuthStatus().then(setStatus).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters');
        return;
      }
    }

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      // Error is already set in store
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-bg text-text flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-accent scan-lines flex-col justify-between p-12">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 border-2 border-bg rotate-45 flex items-center justify-center">
              <div className="w-3 h-3 bg-bg rotate-45" />
            </div>
          </div>
          
          {/* Tagline */}
          <h1 className="font-serif text-5xl text-bg leading-tight">
            Discover what<br />
            you didn't know<br />
            you were<br />
            looking for.
          </h1>
        </div>
        
        {/* Stats */}
        <div className="flex gap-12">
          <div>
            <div className="text-4xl font-serif text-bg">
              {status?.users_registered || 0}
            </div>
            <div className="text-sm text-bg/70 uppercase tracking-wider mt-1">
              Explorers
            </div>
          </div>
          <div>
            <div className="text-4xl font-serif text-bg">
              {status?.slots_available || 0}
            </div>
            <div className="text-sm text-bg/70 uppercase tracking-wider mt-1">
              Slots Available
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-6 h-6 border-2 border-text-cream rotate-45 flex items-center justify-center">
                <div className="w-2 h-2 bg-text-cream rotate-45" />
              </div>
            </div>
            <h1 className="font-serif text-2xl text-text-cream">
              Curiosity Engine
            </h1>
            <p className="text-muted-olive text-sm mt-2">
              Autonomous exploration system
            </p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block mb-8">
            <h2 className="font-serif text-3xl text-text-cream mb-2">
              {mode === 'login' ? 'Welcome back' : 'Join the exploration'}
            </h2>
            <p className="text-muted">
              {mode === 'login' 
                ? 'Enter your credentials to continue'
                : 'Create an account to start discovering'
              }
            </p>
          </div>

          {/* Status indicator (mobile) */}
          {status && (
            <div className="lg:hidden mb-6 p-4 border border-border bg-panel">
              <div className="flex justify-between text-sm">
                <span className="text-muted-olive uppercase tracking-wider">Slots</span>
                <span className={status.slots_available > 0 ? 'text-ok' : 'text-danger'}>
                  {status.slots_available} / {status.max_users}
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => { setMode('login'); clearError(); setLocalError(null); }}
                className={`flex-1 py-3 text-sm uppercase tracking-wider transition-colors ${
                  mode === 'login' 
                    ? 'text-text-cream border-b-2 border-text-cream -mb-px' 
                    : 'text-muted hover:text-text'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); clearError(); setLocalError(null); }}
                className={`flex-1 py-3 text-sm uppercase tracking-wider transition-colors ${
                  mode === 'signup' 
                    ? 'text-text-cream border-b-2 border-text-cream -mb-px' 
                    : 'text-muted hover:text-text'
                }`}
                disabled={status ? !status.accepting_signups : false}
              >
                Sign Up
              </button>
            </div>

            {/* Error */}
            {displayError && (
              <div className="p-4 border border-danger/30 bg-danger/10 text-danger text-sm">
                {displayError}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs text-muted-olive uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg border border-border p-3 text-text placeholder-muted-olive focus:border-text-cream focus:outline-none transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-muted-olive uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg border border-border p-3 text-text placeholder-muted-olive focus:border-text-cream focus:outline-none transition-colors"
                placeholder="********"
                required
                minLength={8}
              />
            </div>

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-muted-olive uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-bg border border-border p-3 text-text placeholder-muted-olive focus:border-text-cream focus:outline-none transition-colors"
                  placeholder="********"
                  required
                  minLength={8}
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || (mode === 'signup' && status !== null && !status.accepting_signups)}
              className="w-full py-4 bg-text-cream text-bg text-sm uppercase tracking-wider font-medium hover:bg-white disabled:bg-border disabled:text-muted disabled:cursor-not-allowed transition-colors rounded-md"
            >
              {isLoading ? 'Processing...' : mode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-12 text-center">
            <div className="dotted-separator mb-6" />
            <p className="text-xs text-muted-olive">
              <a href="https://blackabee.com" className="hover:text-text-cream transition-colors">
                blackabee.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
