import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { NoticeTone } from '../types';

interface AuthModalProps {
  mode: 'signin' | 'signup';
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (value: string) => void;
  onNotify: (tone: NoticeTone, message: string) => void;
}

export function AuthModal({ mode, isOpen, onClose, onStatusChange, onNotify }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setUsername('');
      setAuthBusy(false);
    }
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    onStatusChange('Processing auth...');

    if (mode === 'signup') {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username.trim() }
        }
      });

      setAuthBusy(false);
      if (error) {
        onStatusChange(`Auth error: ${error.message}`);
        onNotify('error', `Sign up failed: ${error.message}`);
        return;
      }

      const verifyMessage = data.user?.identities?.length
        ? 'Sign up complete. Check your email to verify your account.'
        : 'Account may already exist. Try Sign in or Reset Password.';

      onStatusChange(verifyMessage);
      onNotify('success', verifyMessage);
      onClose();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthBusy(false);

    if (error) {
      onStatusChange(`Auth error: ${error.message}`);
      onNotify('error', `Sign in failed: ${error.message}`);
      return;
    }

    onStatusChange('Sign in complete. Welcome back.');
    onNotify('success', 'Sign in complete. You can now rank on Top Lizard.');
    onClose();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="modal-card auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'signup' ? 'Sign up' : 'Sign in'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head auth-head">
          <div>
            <p className="auth-eyebrow">{mode === 'signup' ? 'Join Top Lizard' : 'Account Access'}</p>
            <h2 className="auth-title">{mode === 'signup' ? 'Create your lizard account' : 'Welcome back'}</h2>
            <p className="auth-subtext">
              {mode === 'signup'
                ? 'Sign up to record personal taps and appear in the leaderboard.'
                : 'Sign in to continue climbing the Top Lizard board.'}
            </p>
          </div>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-fields">
            {mode === 'signup' && (
              <label>
                Username
                <input
                  required
                  minLength={3}
                  maxLength={24}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="LizardLegend"
                />
              </label>
            )}
            <label>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
          </div>

          <div className="auth-actions">
            <p className="auth-helper">
              {mode === 'signup'
                ? 'You may need to verify your email before your first ranked tap.'
                : 'Forgot password? Use account recovery if enabled.'}
            </p>
            <button className="primary" disabled={authBusy} type="submit">
              {authBusy ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
