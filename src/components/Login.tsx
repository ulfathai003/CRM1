import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { VmsLogo } from './VmsLogo';

export default function Login() {
  const { login } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isForgot, setIsForgot] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6 && !isForgot) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (isForgot) {
      alert('Password reset link sent to ' + email);
      setIsForgot(false);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      login({
        id: 'usr_' + Date.now(),
        email,
        name: email.split('@')[0],
        role: 'ADMIN' // Default to admin for testing
      });
    }, 1500);
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4">
      <div className="bauhaus-card w-full max-w-md p-8 md:p-12 border-8 relative overflow-hidden bg-white z-10">
        {isLoading && (
          <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center">
            <VmsLogo className="w-24 h-24 mb-6 animate-pulse" />
            <div className="w-16 h-16 animate-bauhaus mb-4"></div>
            <p className="heavy-text uppercase tracking-[0.2em] animate-pulse">Authenticating</p>
          </div>
        )}
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-white mx-auto mb-4 flex items-center justify-center border-4 border-black relative overflow-hidden">
             <VmsLogo className="w-16 h-16 relative z-10" />
          </div>
          <h1 className="text-4xl heavy-text uppercase leading-none">Inside VMS<br/><span className="text-xs tracking-[0.3em] font-light">SYSTEMS & INFO</span></h1>
        </div>

        {error && (
          <div className="bg-[#FFB703] p-3 mb-6 font-light text-sm border-4 border-black text-center">
            ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block heavy-text uppercase mb-2 text-sm tracking-widest">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bauhaus-input"
              placeholder="admin@test.com"
              required
            />
          </div>

          {!isForgot && (
            <div>
              <label className="block heavy-text uppercase mb-2 text-sm tracking-widest">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bauhaus-input"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button type="submit" className="w-full py-4 text-center bg-[#1D3557] text-white bauhaus-button hover:bg-[#E63946] text-lg mt-4 shadow-[8px_8px_0_0_#000]">
            {isForgot ? 'Send Reset Link' : 'Login Proceed'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-4 border-black text-center text-sm heavy-text uppercase tracking-widest">
          <button
            onClick={() => setIsForgot(!isForgot)}
            className="hover:text-[#E63946] transition-colors"
          >
            {isForgot ? 'Back to Login' : 'Forgot Password?'}
          </button>
        </div>
      </div>
    </div>
  );
}
