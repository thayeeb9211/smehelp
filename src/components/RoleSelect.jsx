import React, { useState } from 'react';
import { Cpu, Shield, ArrowRight } from 'lucide-react';
import { auth, googleProvider } from '../utils/firebase';
import { signInWithPopup } from 'firebase/auth';

export default function RoleSelect({ onSelect }) {
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null); // 'engineer' | 'sme'
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');

  const mockGoogleAccounts = [
    { name: 'Sarah Connor', email: 'sconnor@enphase.com', role: 'engineer', avatarColor: '#a855f7' },
    { name: 'Installer Joe', email: 'j.installer@gmail.com', role: 'engineer', avatarColor: '#c084fc' },
    { name: 'Expert John Silberman', email: 'jsilberman@enphase.com', role: 'sme', avatarColor: '#06b6d4' },
    { name: 'SME Lead Ripley', email: 'ripley@enphase.com', role: 'sme', avatarColor: '#22d3ee' }
  ];

  const isFirebaseConfigured = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    return apiKey && apiKey !== 'YOUR_API_KEY' && apiKey.trim() !== '';
  };

  const handleGoogleSignIn = async () => {
    setError('');
    if (!isFirebaseConfigured()) {
      // Fallback directly to interactive mock modal
      setShowGoogleModal(true);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;
      
      // Pass the authenticated Google user details.
      // Since Google Auth has no built-in "Role", Role will be selected dynamically
      onSelect({
        name: gUser.displayName || 'Google Engineer',
        email: gUser.email,
        role: null, // Let App.jsx prompt for role Selection
        avatarColor: '#9333ea',
        uid: gUser.uid
      });
    } catch (err) {
      console.error("Firebase Google Auth Error: ", err);
      setError('Google Sign-in failed or cancelled. Opening fallback sandbox accounts.');
      setShowGoogleModal(true);
    }
  };

  const handleAccountSelect = (account) => {
    onSelect({
      name: account.name,
      email: account.email,
      role: account.role,
      avatarColor: account.avatarColor
    });
  };

  const handleCustomLogin = (e) => {
    e.preventDefault();
    if (!customName.trim() || !customEmail.trim()) {
      setError('Please fill in both Name and Email.');
      return;
    }
    if (!selectedRole) {
      setError('Please select a role.');
      return;
    }
    if (!customEmail.includes('@')) {
      setError('Please enter a valid Google account email.');
      return;
    }
    
    onSelect({
      name: customName.trim(),
      email: customEmail.trim(),
      role: selectedRole,
      avatarColor: selectedRole === 'sme' ? '#06b6d4' : '#a855f7'
    });
  };

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
          SMEHelp Incident Control
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          Triage and collaborate on site issues in real-time. Please authenticate using Google SSO.
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

        {!showGoogleModal ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            {/* Google Sign-in button */}
            <button
              onClick={handleGoogleSignIn}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                maxWidth: '350px',
                padding: '12px 24px',
                background: '#ffffff',
                color: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
              }}
            >
              {/* Google Brand G Logo icon */}
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.85 2.69-6.57z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.33-1.58-5.04-3.71H.95v2.3C2.43 15.98 5.48 18 9 18z"/>
                <path fill="#FBBC05" d="M3.96 10.74c-.18-.54-.28-1.12-.28-1.74s.1-1.2.28-1.74V4.96H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.04l3.01-2.3z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.1C13.46.66 11.42 0 9 0 5.48 0 2.43 2.02.95 4.96l3.01 2.3c.71-2.13 2.69-3.71 5.04-3.71z"/>
              </svg>
              Sign In with Google
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Secure authentication via corporate account
            </span>
          </div>
        ) : (
          <div className="fade-in" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: '#fff' }}>
                Google Sandbox accounts
              </h3>
              <button 
                onClick={() => { setShowGoogleModal(false); setError(''); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Back
              </button>
            </div>

            {/* List of Mock Accounts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
              {mockGoogleAccounts.map((account, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAccountSelect(account)}
                  className="glass-panel glass-panel-hover"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    color: 'inherit',
                    textAlign: 'left',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: account.avatarColor,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase'
                  }}>
                    {account.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{account.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{account.email}</div>
                  </div>
                  <span className={`badge badge-${account.role === 'sme' ? 'medium' : 'low'}`} style={{ fontSize: '0.65rem' }}>
                    {account.role.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
              <span>OR USE ANOTHER ACCOUNT</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
            </div>

            {/* Custom Account Sign-in Form */}
            <form onSubmit={handleCustomLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  className="glass-input"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                />
                <input
                  type="email"
                  placeholder="Google Email"
                  className="glass-input"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                />
              </div>

              {/* Role selection for custom login */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedRole('engineer')}
                  className="glass-panel"
                  style={{
                    flex: 1,
                    padding: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: selectedRole === 'engineer' ? '#a855f7' : 'var(--text-secondary)',
                    border: selectedRole === 'engineer' ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
                    background: selectedRole === 'engineer' ? 'rgba(147, 51, 234, 0.1)' : 'transparent',
                  }}
                >
                  <Cpu size={12} style={{ marginRight: '4px' }} /> Engineer
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('sme')}
                  className="glass-panel"
                  style={{
                    flex: 1,
                    padding: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: selectedRole === 'sme' ? '#06b6d4' : 'var(--text-secondary)',
                    border: selectedRole === 'sme' ? '1px solid var(--color-secondary)' : '1px solid var(--glass-border)',
                    background: selectedRole === 'sme' ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                  }}
                >
                  <Shield size={12} style={{ marginRight: '4px' }} /> SME
                </button>
              </div>

              <button type="submit" className="glass-btn" style={{ padding: '10px', fontSize: '0.85rem', width: '100%' }}>
                Access with custom account <ArrowRight size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
