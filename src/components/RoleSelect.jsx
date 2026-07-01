import React, { useState } from 'react';
import { ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { auth, googleProvider } from '../utils/firebase';
import { signInWithPopup } from 'firebase/auth';
import secretConfig from '../utils/secret_config.json';

export default function RoleSelect({ onSelect }) {
  const [customEmail, setCustomEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authFailed, setAuthFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resolveRole = (email, accountRole) => {
    if (accountRole) return accountRole;
    if (!email) return 'engineer';
    const cleanEmail = email.toLowerCase().trim();
    
    // Root Admin Check
    if (cleanEmail === secretConfig.root.email.toLowerCase().trim()) {
      return 'root';
    }
    // Supervisor Check
    if (secretConfig.supervisor_emails.map(e => e.toLowerCase().trim()).includes(cleanEmail)) {
      return 'supervisor';
    }
    // Manager Check
    if (secretConfig.manager_emails.map(e => e.toLowerCase().trim()).includes(cleanEmail)) {
      return 'manager';
    }
    // Senior Manager Check
    if (secretConfig.senior_manager_emails.map(e => e.toLowerCase().trim()).includes(cleanEmail)) {
      return 'senior_manager';
    }
    // SME Check
    if (secretConfig.sme_emails.map(e => e.toLowerCase().trim()).includes(cleanEmail)) {
      return 'sme';
    }
    return 'engineer';
  };

  const getAvatarColor = (role) => {
    if (role === 'sme') return '#06b6d4';
    if (role === 'supervisor') return '#ec4899';
    if (role === 'manager') return '#3b82f6';
    if (role === 'senior_manager') return '#f59e0b';
    if (role === 'root') return '#10b981';
    return '#a855f7';
  };

  const isFirebaseConfigured = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    return apiKey && apiKey !== 'YOUR_API_KEY' && apiKey.trim() !== '';
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    if (!isFirebaseConfigured()) {
      setTimeout(() => {
        setAuthFailed(true);
        setIsLoading(false);
      }, 800);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;
      const email = gUser.email;
      const role = resolveRole(email);
      
      onSelect({
        name: gUser.displayName || (role === 'sme' ? 'Google SME' : 'Google Engineer'),
        email: email,
        role: role,
        avatarColor: getAvatarColor(role),
        uid: gUser.uid
      });
      setIsLoading(false);
    } catch (err) {
      console.error("Firebase Google Auth Error: ", err);
      setAuthFailed(true);
      setIsLoading(false);
    }
  };

  const handleCustomLogin = (e) => {
    e.preventDefault();
    if (!customEmail.trim()) {
      setError('Please fill in your Email Address.');
      return;
    }
    if (!customEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const email = customEmail.trim().toLowerCase();

    // Check root credentials
    if (email === secretConfig.root.email.toLowerCase().trim()) {
      if (password !== secretConfig.root.password) {
        setError('Authentication failed. Please check your credentials.');
        return;
      }
    }
    
    const role = resolveRole(email);

    // Derive display name from email prefix
    const derivedName = email.split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    onSelect({
      name: derivedName,
      email: email,
      role: role,
      avatarColor: getAvatarColor(role)
    });
  };

  if (authFailed) {
    return (
      <div className="fade-in" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
      }}>
        <div className="glass-panel" style={{
          padding: '3rem 2.5rem',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          background: 'rgba(239, 68, 68, 0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid var(--status-critical)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={36} style={{ color: 'var(--status-critical)' }} />
            </div>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 800,
            marginBottom: '1rem',
            color: '#fff'
          }}>
            404 - Authorization Failed
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
            We could not authorize your account or the authentication configurations are invalid. Please check your credentials and try again.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="glass-btn"
            style={{
              padding: '12px 24px',
              fontSize: '0.95rem',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
            }}
          >
            <RefreshCw size={16} /> Refresh Page to Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
    }}>
      <div className="glass-panel" style={{
        padding: '3rem 2.5rem',
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.25rem',
          fontWeight: 800,
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #fff 0%, #9ca3af 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          SME Help Desk
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          Triage and collaborate on site issues in real-time. Please authenticate.
        </p>

        {error && (
          <div style={{
            color: 'var(--status-high)',
            fontSize: '0.8rem',
            marginBottom: '1rem',
            background: 'rgba(245, 158, 11, 0.1)',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', width: '100%' }}>
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 24px',
              background: '#ffffff',
              color: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.95rem',
              fontFamily: 'var(--font-sans)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.85 2.69-6.57z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.33-1.58-5.04-3.71H.95v2.3C2.43 15.98 5.48 18 9 18z"/>
              <path fill="#FBBC05" d="M3.96 10.74c-.18-.54-.28-1.12-.28-1.74s.1-1.2.28-1.74V4.96H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.04l3.01-2.3z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.1C13.46.66 11.42 0 9 0 5.48 0 2.43 2.02.95 4.96l3.01 2.3c.71-2.13 2.69-3.71 5.04-3.71z"/>
            </svg>
            {isLoading ? 'Connecting...' : 'Sign In with Google SSO'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
            <span>OR SECURE CUSTOM LOGIN</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
          </div>

          <form onSubmit={handleCustomLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email Address</label>
              <input
                type="email"
                placeholder="Email Address"
                className="glass-input"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                placeholder="Password"
                className="glass-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              />
            </div>

            <button type="submit" className="glass-btn" style={{ padding: '10px', fontSize: '0.85rem', width: '100%', marginTop: '4px' }}>
              Access Portal <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
