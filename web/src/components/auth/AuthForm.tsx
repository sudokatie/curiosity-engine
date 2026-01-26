/**
 * Authentication Form Component
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-mono font-bold tracking-wider">CURIOSITY ENGINE</h1>
          <p className="text-gray-500 text-sm mt-2 font-mono">
            Autonomous exploration system
          </p>
        </div>

        {/* Status */}
        {status && (
          <div className="mb-6 p-3 border border-gray-800 bg-gray-900/50 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">SLOTS AVAILABLE</span>
              <span className={status.slots_available > 0 ? 'text-green-500' : 'text-red-500'}>
                {status.slots_available} / {status.max_users}
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              type="button"
              onClick={() => { setMode('login'); clearError(); setLocalError(null); }}
              className={`flex-1 py-2 text-sm font-mono tracking-wider ${
                mode === 'login' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); clearError(); setLocalError(null); }}
              className={`flex-1 py-2 text-sm font-mono tracking-wider ${
                mode === 'signup' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              disabled={status ? !status.accepting_signups : false}
            >
              SIGN UP
            </button>
          </div>

          {/* Error */}
          {displayError && (
            <div className="p-3 border border-red-900 bg-red-900/20 text-red-400 text-sm font-mono">
              {displayError}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1 tracking-wider">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-gray-800 p-3 font-mono text-sm focus:border-white focus:outline-none"
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1 tracking-wider">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-800 p-3 font-mono text-sm focus:border-white focus:outline-none"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {/* Confirm Password (signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1 tracking-wider">
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black border border-gray-800 p-3 font-mono text-sm focus:border-white focus:outline-none"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || (mode === 'signup' && status !== null && !status.accepting_signups)}
            className="w-full py-3 bg-white text-black font-mono text-sm tracking-wider hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'PROCESSING...' : mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-xs font-mono text-gray-600">
          <p>Discover what you didn't know you were looking for.</p>
          <p className="mt-2">
            <a href="https://blackabee.com" className="hover:text-gray-400">
              blackabee.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
