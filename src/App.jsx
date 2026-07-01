import React, { useState, useEffect } from 'react';
import { useRealTime } from './hooks/useRealTime';
import RoleSelect from './components/RoleSelect';
import EngineerDashboard from './components/EngineerDashboard';
import SmeDashboard from './components/SmeDashboard';
import ChatWorkspace from './components/ChatWorkspace';
import { Terminal, LogOut, Trash2 } from 'lucide-react';
import { auth } from './utils/firebase';
import { signOut } from 'firebase/auth';
import secretConfig from './utils/secret_config.json';

const resolveRole = (email) => {
  if (!email) return 'engineer';
  const cleanEmail = email.toLowerCase().trim();
  
  if (cleanEmail === secretConfig.root.email.toLowerCase().trim()) return 'root';
  if (secretConfig.supervisor_emails.map(e => e.toLowerCase().trim()).includes(cleanEmail)) return 'supervisor';
  if (secretConfig.manager_emails.map(e => e.toLowerCase().trim()).includes(cleanEmail)) return 'manager';
  if (secretConfig.senior_manager_emails.map(e => e.toLowerCase().trim()).includes(cleanEmail)) return 'senior_manager';
  if (secretConfig.sme_emails.map(e => e.toLowerCase().trim()).includes(cleanEmail)) return 'sme';
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

export default function App() {
  const { cases, messages, teams, createCase, acceptCase, resolveCase, deleteCase, sendMessage, deleteMessage, createTeam, addTeamMember, assignTeamManager, clearAllData } = useRealTime();
  
  // Current user state isolated to localStorage for refresh persistence
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('smehelp_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Current active workspace case (if in chat room) preserved on refresh
  const [activeWorkspaceCase, setActiveWorkspaceCase] = useState(() => {
    const savedCase = localStorage.getItem('smehelp_active_case');
    return savedCase ? JSON.parse(savedCase) : null;
  });

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const isFirebase = import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'YOUR_API_KEY';
    if (!isFirebase) return;

    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        // Resolve role from email
        const email = firebaseUser.email;
        const role = resolveRole(email);
        setUser({
          name: firebaseUser.displayName || (role === 'sme' ? 'Google SME' : 'Google Engineer'),
          email: email,
          role: role,
          avatarColor: getAvatarColor(role),
          uid: firebaseUser.uid
        });
      } else {
        // Only clear user if the user was signed in with Firebase (had a uid)
        const saved = localStorage.getItem('smehelp_current_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.uid) {
            setUser(null);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync user state to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('smehelp_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('smehelp_current_user');
      localStorage.removeItem('smehelp_active_case');
      setActiveWorkspaceCase(null);
    }
  }, [user]);

  // Sync active workspace case state to localStorage
  useEffect(() => {
    if (activeWorkspaceCase) {
      localStorage.setItem('smehelp_active_case', JSON.stringify(activeWorkspaceCase));
    } else {
      localStorage.removeItem('smehelp_active_case');
    }
  }, [activeWorkspaceCase]);

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

  return (
    <div className="app-container">
      {/* Decorative Orbs */}
      <div className="decor-orb decor-orb-1"></div>
      <div className="decor-orb decor-orb-2"></div>

      {/* Corporate Header */}
      <header className="glass-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-container">
            <Terminal size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1 className="logo-text">SMEHelp</h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              ENPHASE TRIAGE ENGINE
            </span>
          </div>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {user.role && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Logged in: <strong style={{ color: '#fff' }}>{user.name}</strong> ({user.role.toUpperCase()})
              </span>
            )}
            {/* Database wipe is strictly restricted to Managers and Admins */}
            {['manager', 'senior_manager', 'root'].includes(user.role) && (
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
            )}
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
        ) : activeWorkspaceCase ? (
          <ChatWorkspace
            user={user}
            activeCase={activeWorkspaceCase}
            messages={messages}
            onSendMessage={sendMessage}
            onResolveCase={resolveCase}
            onDeleteMessage={deleteMessage}
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
            user={user}
            cases={cases}
            messages={messages}
            teams={teams}
            onAcceptCase={acceptCase}
            onEnterWorkspace={setActiveWorkspaceCase}
            onCreateTeam={createTeam}
            onAddTeamMember={addTeamMember}
            onAssignTeamManager={assignTeamManager}
            onDeleteCase={deleteCase}
          />
        )}
      </main>
    </div>
  );
}
