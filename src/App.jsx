import React, { useState, useEffect } from 'react';
import { useRealTime } from './hooks/useRealTime';
import RoleSelect from './components/RoleSelect';
import EngineerDashboard from './components/EngineerDashboard';
import SmeDashboard from './components/SmeDashboard';
import ChatWorkspace from './components/ChatWorkspace';
import { Terminal, LogOut, Trash2, Cpu, Shield } from 'lucide-react';
import { auth } from './utils/firebase';
import { signOut } from 'firebase/auth';

export default function App() {
  const { cases, messages, createCase, acceptCase, resolveCase, sendMessage, clearAllData } = useRealTime();
  
  // Current user state isolated to this tab's sessionStorage / Auth
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('smehelp_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Current active workspace case (if in chat room)
  const [activeWorkspaceCase, setActiveWorkspaceCase] = useState(null);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const isFirebase = import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'YOUR_API_KEY';
    if (!isFirebase) return;

    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        // If logged in via Firebase but role is not set, set basic user details
        const saved = sessionStorage.getItem('smehelp_current_user');
        if (saved) {
          setUser(JSON.parse(saved));
        } else {
          setUser({
            name: firebaseUser.displayName || 'Google User',
            email: firebaseUser.email,
            role: null, // Prompt for role
            avatarColor: '#9333ea',
            uid: firebaseUser.uid
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync user state to sessionStorage
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('smehelp_current_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('smehelp_current_user');
      setActiveWorkspaceCase(null);
    }
  }, [user]);

  // If user is engineer, automatically open chat workspace when their case becomes active
  useEffect(() => {
    if (user && user.role === 'engineer') {
      const myActiveCase = cases.find(
        c => c.engineerName === user.name && c.status === 'active'
      );
      if (myActiveCase) {
        setActiveWorkspaceCase(myActiveCase);
      }
    }
  }, [cases, user]);

  // If case is deleted or reset, back out of workspace
  useEffect(() => {
    if (activeWorkspaceCase) {
      const currentCaseState = cases.find(c => c.id === activeWorkspaceCase.id);
      if (!currentCaseState) {
        setActiveWorkspaceCase(null);
      } else if (currentCaseState.status !== activeWorkspaceCase.status) {
        setActiveWorkspaceCase(currentCaseState);
      }
    }
  }, [cases, activeWorkspaceCase]);

  const handleLogout = async () => {
    const isFirebase = import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'YOUR_API_KEY';
    if (isFirebase) {
      await signOut(auth);
    }
    setUser(null);
  };

  const handleRoleSelection = (role) => {
    setUser(prev => ({
      ...prev,
      role,
      avatarColor: role === 'sme' ? '#06b6d4' : '#a855f7'
    }));
  };

  return (
    <div className="app-container">
      {/* Decorative Orbs */}
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>

      {/* Shared Nav Header */}
      <header>
        <div className="logo-container">
          <div style={{
            background: 'rgba(147, 51, 234, 0.2)',
            border: '1px solid var(--color-primary)',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)'
          }}>
            <Terminal size={20} />
          </div>
          <span className="logo-text">SMEHELP</span>
          <span className="logo-tag">V1.2</span>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user.role && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Logged in: <strong style={{ color: '#fff' }}>{user.name}</strong> ({user.role.toUpperCase()})
              </span>
            )}
            <button
              onClick={clearAllData}
              className="glass-panel"
              title="Reset workspace demo data"
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--status-critical)',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={12} /> Wipe Database
            </button>
            <button
              onClick={handleLogout}
              className="glass-panel"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: '#fff',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={12} /> Log Out
            </button>
          </div>
        )}
      </header>

      {/* Main Workspace container */}
      <main>
        {!user ? (
          <RoleSelect onSelect={setUser} />
        ) : !user.role ? (
          // Role Selection Overlay for Google Authenticated Users
          <div className="fade-in" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
          }}>
            <div className="glass-panel" style={{
              padding: '3rem 2.5rem',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center',
              border: '1px solid var(--glass-border)'
            }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
                Select App Access Role
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>
                Welcome {user.name}! To proceed, please select your escalations role.
              </p>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  onClick={() => handleRoleSelection('engineer')}
                  className="glass-panel glass-panel-hover"
                  style={{
                    flex: 1,
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    color: '#fff',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(147, 51, 234, 0.05)'
                  }}
                >
                  <Cpu size={32} style={{ color: '#a855f7' }} />
                  <div style={{ fontWeight: 700 }}>ENGINEER</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>File & monitor site issues</div>
                </button>
                
                <button
                  onClick={() => handleRoleSelection('sme')}
                  className="glass-panel glass-panel-hover"
                  style={{
                    flex: 1,
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    color: '#fff',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(6, 182, 212, 0.05)'
                  }}
                >
                  <Shield size={32} style={{ color: '#06b6d4' }} />
                  <div style={{ fontWeight: 700 }}>SME EXPERT</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resolve escalations & analyze</div>
                </button>
              </div>
            </div>
          </div>
        ) : activeWorkspaceCase ? (
          <ChatWorkspace
            user={user}
            activeCase={activeWorkspaceCase}
            messages={messages}
            onSendMessage={sendMessage}
            onResolveCase={resolveCase}
            onBack={() => setActiveWorkspaceCase(null)}
          />
        ) : user.role === 'engineer' ? (
          <EngineerDashboard
            engineerName={user.name}
            cases={cases}
            messages={messages}
            onCreateCase={createCase}
          />
        ) : (
          <SmeDashboard
            smeName={user.name}
            cases={cases}
            messages={messages}
            onAcceptCase={acceptCase}
            onEnterWorkspace={setActiveWorkspaceCase}
          />
        )}
      </main>
    </div>
  );
}
