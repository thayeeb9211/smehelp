import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, CheckCircle, ArrowRight, User, Clock, BarChart3, Database, Users, Download, Plus, Trash2, X, MessageSquare, BarChart2 } from 'lucide-react';
import { generateSessionPDF } from '../utils/pdfGenerator';

const WaitingTimer = ({ createdAt }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calculateElapsed = () => {
      const diffMs = new Date() - new Date(createdAt);
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      return `${mins}m ${secs}s`;
    };

    setElapsed(calculateElapsed());
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return <span>{elapsed}</span>;
};

// Fallback static teams
const STATIC_TEAMS = ['Team Alpha', 'Team Beta', 'Team Gamma'];

const getEngineerTeam = (engineerName) => {
  if (engineerName === 'Sarah Connor') return 'Team Alpha';
  if (engineerName === 'Installer Joe') return 'Team Beta';
  if (engineerName === 'Mohammed Thayeeb Shariff') return 'Team Gamma';
  
  let hash = 0;
  for (let i = 0; i < engineerName.length; i++) {
    hash = engineerName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % STATIC_TEAMS.length;
  return STATIC_TEAMS[index];
};

// Find which team a case belongs to (checks dynamic teams, falls back to static)
const getCaseTeamName = (c, teamsList) => {
  const dynamicTeam = teamsList.find(t => 
    t.members.some(m => 
      m.toLowerCase().trim() === c.engineerName.toLowerCase().trim() ||
      (c.email && m.toLowerCase().trim() === c.email.toLowerCase().trim())
    )
  );
  return dynamicTeam ? dynamicTeam.name : getEngineerTeam(c.engineerName);
};

// Check if user role/name has access to a specific team
const canAccessTeam = (userRole, userName, teamName, teamsList) => {
  if (['root', 'senior_manager', 'supervisor', 'sme'].includes(userRole)) {
    return true;
  }
  if (userRole === 'manager') {
    // Dynamic manager mapping check
    const managedDynamic = teamsList
      .filter(t => t.manager.toLowerCase().trim() === userName.toLowerCase().trim())
      .map(t => t.name);
    
    // Fallback static manager mapping check
    const staticManagers = {
      'Manager Mike': ['Team Alpha', 'Team Beta', 'Team Gamma'],
      'Manager Sarah': ['Team Delta', 'Team Epsilon']
    };
    const managedStatic = staticManagers[userName] || [];
    
    const allManaged = [...managedDynamic, ...managedStatic];
    return allManaged.includes(teamName);
  }
  return false;
};

// Compute dynamic chat metrics for details panel
const getCaseMetrics = (caseObj, messagesList) => {
  const caseMsgs = messagesList.filter(m => m.caseId === caseObj.id);
  const total = caseMsgs.length;
  const agentMsgs = caseMsgs.filter(m => m.senderRole === 'engineer').length;
  const smeMsgs = caseMsgs.filter(m => m.senderRole === 'sme').length;
  
  let sessionTimeStr = '0 mins';
  if (caseMsgs.length > 1) {
    const firstMsg = caseMsgs[0];
    const lastMsg = caseMsgs[caseMsgs.length - 1];
    if (firstMsg.timestampOrder && lastMsg.timestampOrder) {
      const diffMs = lastMsg.timestampOrder - firstMsg.timestampOrder;
      const mins = Math.max(1, Math.round(diffMs / 60000));
      sessionTimeStr = `${mins} mins`;
    }
  }
  
  return {
    total,
    agentMsgs,
    smeMsgs,
    sessionTimeStr
  };
};

export default function SmeDashboard({ 
  user, 
  cases, 
  messages = [], 
  teams = [], 
  onAcceptCase, 
  onEnterWorkspace, 
  onCreateTeam, 
  onAddTeamMember, 
  onAssignTeamManager,
  onDeleteCase 
}) {
  const smeName = user.name;
  const userRole = user.role;
  
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('smehelp_active_tab') || 'queue';
  });

  // Team Hub State
  const [selectedTeamId, setSelectedTeamId] = useState(() => {
    return localStorage.getItem('smehelp_selected_team_id') || '';
  });
  
  const [selectedCase, setSelectedCase] = useState(null); // Case object for detail drawer
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamManager, setNewTeamManager] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  const [averageWaitTimeStr, setAverageWaitTimeStr] = useState('N/A');

  // Sync tab and team selections to localStorage
  useEffect(() => {
    localStorage.setItem('smehelp_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem('smehelp_selected_team_id', selectedTeamId);
    }
  }, [selectedTeamId]);

  // Default select first team when loaded or teams update
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      // Find first accessible team
      const firstAccessible = teams.find(t => canAccessTeam(userRole, smeName, t.name, teams));
      if (firstAccessible) {
        setSelectedTeamId(firstAccessible.id);
      }
    }
  }, [teams, selectedTeamId, userRole, smeName]);

  // Filter cases based on manager access bounds
  const visibleCases = cases.filter(c => {
    const teamName = getCaseTeamName(c, teams);
    return canAccessTeam(userRole, smeName, teamName, teams);
  });

  // Calculate dynamic average wait time updating every 5 seconds
  useEffect(() => {
    const calculateAverageWait = () => {
      const casesToCalculate = visibleCases.filter(c => c.status === 'pending' || c.acceptedAt);
      if (casesToCalculate.length === 0) {
        setAverageWaitTimeStr('N/A');
        return;
      }
      let totalWaitMs = 0;
      casesToCalculate.forEach(c => {
        if (c.status === 'pending') {
          totalWaitMs += Date.now() - new Date(c.createdAt).getTime();
        } else {
          const start = new Date(c.createdAt).getTime();
          const end = new Date(c.acceptedAt).getTime();
          totalWaitMs += Math.max(0, end - start);
        }
      });
      const avgSecs = Math.round((totalWaitMs / casesToCalculate.length) / 1000);
      const avgMins = Math.floor(avgSecs / 60);
      const avgRemainingSecs = avgSecs % 60;
      setAverageWaitTimeStr(`${avgMins}m ${avgRemainingSecs}s`);
    };

    calculateAverageWait();
    const interval = setInterval(calculateAverageWait, 5000);
    return () => clearInterval(interval);
  }, [visibleCases]);

  // Compute metrics count
  const pendingCases = visibleCases.filter(c => c.status === 'pending');
  const activeCases = visibleCases.filter(c => c.status === 'active' && (c.smeName === smeName || ['supervisor', 'manager', 'senior_manager', 'root'].includes(userRole)));
  const resolvedCases = visibleCases.filter(c => c.status === 'resolved');

  // Compile Analytics data
  const engineerStats = {};
  let totalOnsiteCount = 0;
  let totalOffsiteCount = 0;

  visibleCases.forEach(c => {
    if (!engineerStats[c.engineerName]) {
      engineerStats[c.engineerName] = {
        total: 0,
        pending: 0,
        active: 0,
        resolved: 0,
        monthCount: 0,
        team: getCaseTeamName(c, teams)
      };
    }
    engineerStats[c.engineerName].total += 1;
    engineerStats[c.engineerName][c.status] += 1;

    const createdDate = new Date(c.createdAt);
    const now = new Date();
    if (createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear()) {
      engineerStats[c.engineerName].monthCount += 1;
    }

    if (c.presentOnsite === 'Yes') {
      totalOnsiteCount += 1;
    } else {
      totalOffsiteCount += 1;
    }
  });

  const handleCreateTeamSubmit = (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamManager.trim()) return;
    onCreateTeam(newTeamName.trim(), newTeamManager.trim());
    setNewTeamName('');
    setNewTeamManager('');
  };

  const handleAddMemberSubmit = (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !selectedTeamId) return;
    onAddTeamMember(selectedTeamId, newMemberEmail.trim());
    setNewMemberEmail('');
  };

  // Find currently selected team details
  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const selectedTeamCases = selectedTeam ? cases.filter(c => getCaseTeamName(c, teams) === selectedTeam.name) : [];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* Control Hub Navigation & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
            {['manager', 'senior_manager', 'root', 'supervisor'].includes(userRole) ? 'SME Triage & Analysis Hub' : 'SME Incident Control Hub'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Welcome, <strong style={{ color: 'var(--color-secondary)' }}>{smeName}</strong> ({userRole.toUpperCase()}). Monitor queues and review analytics.
          </p>
        </div>

        {/* Tab Selector - ONLY managers, supervisors, senior managers, and root have multiple tabs. SMEs only see queue */}
        {userRole !== 'sme' && (
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            padding: '4px'
          }}>
            <button
              onClick={() => setActiveTab('queue')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'queue' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                color: activeTab === 'queue' ? '#fff' : 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <Activity size={16} /> Triage Queue
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'analytics' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                color: activeTab === 'analytics' ? '#fff' : 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <BarChart3 size={16} /> Hub Analytics
            </button>
            <button
              onClick={() => setActiveTab('teams_hub')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'teams_hub' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                color: activeTab === 'teams_hub' ? '#fff' : 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <Users size={16} /> Analysis Hub
            </button>
          </div>
        )}
      </div>

      {/* Grid of stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            padding: '10px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            color: 'var(--status-medium)',
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Queue Load
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff' }}>
              {pendingCases.length} Pending
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            padding: '10px',
            borderRadius: '10px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            color: 'var(--color-secondary)',
          }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Active Sessions
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff' }}>
              {activeCases.length} Active
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            padding: '10px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--status-low)',
          }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Resolved Globally
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff' }}>
              {resolvedCases.length} Resolved
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            padding: '10px',
            borderRadius: '10px',
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            color: '#a855f7',
          }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Avg Wait Time
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff' }}>
              {averageWaitTimeStr}
            </div>
          </div>
        </div>
      </div>

      {(activeTab === 'queue' || userRole === 'sme') ? (
        /* TRIAGE QUEUE VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          {/* Left Side: Pending Cases */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-medium)' }}></span>
              Incoming Request Queue ({pendingCases.length})
            </h2>

            {pendingCases.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No pending engineer escalations at the moment.
              </div>
            ) : (
              pendingCases.map(c => (
                <div key={c.id} className="glass-panel glass-panel-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-high" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--color-secondary)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                          Site: {c.siteId}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Database size={12} /> SF Case: {c.sfCase}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({getCaseTeamName(c, teams)})
                        </span>
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>
                        {c.issue}
                      </h3>
                    </div>

                    {/* Only SMEs, Supervisors, and Root can accept queue cases */}
                    {['sme', 'supervisor', 'root'].includes(userRole) && (
                      <button
                        onClick={() => onAcceptCase(c.id, smeName)}
                        className="glass-btn glass-btn-cyan"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        Accept Case <ArrowRight size={14} />
                      </button>
                    )}
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <strong>Obstacle / Question:</strong> {c.question}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> Filer: {c.engineerName}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Onsite: {c.presentOnsite}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-secondary)' }}>
                      <Clock size={12} /> Waiting: <WaitingTimer createdAt={c.createdAt} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Side: Active/Assigned Cases */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-secondary)' }}></span>
              Active Triage Rooms ({activeCases.length})
            </h2>

            {activeCases.length === 0 ? (
              <div className="glass-panel" style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No active chat triage rooms.
              </div>
            ) : (
              activeCases.map(c => (
                <div
                  key={c.id}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    borderLeft: '4px solid var(--color-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-low" style={{ borderColor: 'var(--glass-border)' }}>Site: {c.siteId}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateSessionPDF(c, messages);
                        }}
                        title="Download Report PDF"
                        className="glass-panel"
                        style={{
                          padding: '4px 6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          color: '#fff',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Download size={12} />
                      </button>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filer: {c.engineerName}</span>
                    </div>
                  </div>
                  <h4 style={{ fontWeight: 600, color: '#fff', fontSize: '1rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {c.issue}
                  </h4>
                  <button
                    onClick={() => onEnterWorkspace(c)}
                    className="glass-btn glass-btn-secondary"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', marginTop: '4px' }}
                  >
                    Enter Chat Workspace <ArrowRight size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'analytics' ? (
        /* ANALYTICS CONTROL PANEL VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="fade-in">
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
                Onsite Triage Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span>Present Onsite (Yes)</span>
                    <span style={{ fontWeight: 600 }}>{totalOnsiteCount} ({visibleCases.length > 0 ? Math.round((totalOnsiteCount / visibleCases.length) * 100) : 0}%)</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ width: `${visibleCases.length > 0 ? (totalOnsiteCount / visibleCases.length) * 100 : 0}%`, height: '100%', background: 'var(--color-secondary)' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span>Remote / Offsite (No)</span>
                    <span style={{ fontWeight: 600 }}>{totalOffsiteCount} ({visibleCases.length > 0 ? Math.round((totalOffsiteCount / visibleCases.length) * 100) : 0}%)</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ width: `${visibleCases.length > 0 ? (totalOffsiteCount / visibleCases.length) * 100 : 0}%`, height: '100%', background: 'var(--status-medium)' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} /> Engineer Escalation Load
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Track case distribution and caller statuses across the active shifts.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Currently logged database index contains: <strong>{visibleCases.length} entries</strong>.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Request Volume by Engineer
              </h3>
              
              {Object.keys(engineerStats).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                  No stats logged yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(engineerStats).map(([name, stat], idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Pending: {stat.pending} | Active: {stat.active} | Resolved: {stat.resolved}
                        </span>
                      </div>
                      <div style={{
                        background: 'rgba(6, 182, 212, 0.1)',
                        border: '1px solid rgba(6, 182, 212, 0.2)',
                        color: 'var(--color-secondary)',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.95rem'
                      }}>
                        {stat.total} Cases
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Case Issue Register
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {visibleCases.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                    No case records found.
                  </div>
                ) : (
                  visibleCases.map((c, idx) => (
                    <div key={idx} style={{
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Site {c.siteId} // Filer: {c.engineerName} ({getCaseTeamName(c, teams)})
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.issue}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateSessionPDF(c, messages);
                          }}
                          className="glass-panel"
                          style={{
                            padding: '2px 6px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--glass-border)',
                            color: '#fff',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.7rem'
                          }}
                        >
                          <Download size={10} /> PDF
                        </button>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ADVANCED MANAGEMENT ANALYSIS HUB & VOLUMES VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="fade-in">
          
          {/* Create Team Console (Visible to Supervisor and Root only) */}
          {['supervisor', 'root'].includes(userRole) && (
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(147, 51, 234, 0.05)', border: '1px dashed rgba(147, 51, 234, 0.3)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={18} /> Team & Manager Configuration Console
              </h3>
              <form onSubmit={handleCreateTeamSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="New Team Name (e.g. Team Gamma)"
                  className="glass-input"
                  style={{ flex: 1, minWidth: '200px', padding: '8px 12px', fontSize: '0.85rem' }}
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Assign Manager Name (e.g. Manager Mike)"
                  className="glass-input"
                  style={{ flex: 1, minWidth: '200px', padding: '8px 12px', fontSize: '0.85rem' }}
                  value={newTeamManager}
                  onChange={(e) => setNewTeamManager(e.target.value)}
                  required
                />
                <button type="submit" className="glass-btn glass-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Create Team & Map Manager
                </button>
              </form>
            </div>
          )}

          {/* Volume Hub Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: '1.5rem',
            background: 'rgba(0, 0, 0, 0.15)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)'
          }}>
            {/* Left Side: Teams Directory List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderRight: '1px solid var(--glass-border)', paddingRight: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                Teams Directory
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teams.map((t, idx) => {
                  const isAccessible = canAccessTeam(userRole, smeName, t.name, teams);
                  const isActive = selectedTeamId === t.id;
                  const teamCases = cases.filter(c => getCaseTeamName(c, teams) === t.name);
                  const activeCount = teamCases.filter(c => c.status === 'active').length;
                  const resolvedCount = teamCases.filter(c => c.status === 'resolved').length;

                  return (
                    <button
                      key={idx}
                      onClick={() => isAccessible && setSelectedTeamId(t.id)}
                      className="glass-panel"
                      style={{
                        padding: '10px 14px',
                        cursor: isAccessible ? 'pointer' : 'not-allowed',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        background: isActive ? 'rgba(147, 51, 234, 0.15)' : 'rgba(255,255,255,0.02)',
                        border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
                        opacity: isAccessible ? 1 : 0.45,
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: isActive ? '#fff' : 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {t.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Manager: {t.manager}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                        <span>Active: <strong style={{ color: 'var(--color-secondary)' }}>{activeCount}</strong></span>
                        <span>Resolved: <strong style={{ color: 'var(--status-low)' }}>{resolvedCount}</strong></span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Selected Team Details & Submissions Console */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {selectedTeam ? (
                <>
                  {/* Team Profile metadata */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                    <div>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                        {selectedTeam.name} Console
                      </h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Assigned Manager: <strong style={{ color: '#fff' }}>{selectedTeam.manager}</strong>
                      </span>
                    </div>

                    {/* Member addition capability (Supervisor & Root) */}
                    {['supervisor', 'root'].includes(userRole) && (
                      <form onSubmit={handleAddMemberSubmit} style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="email"
                          placeholder="Filer Email (e.g. sconnor@enphase.com)"
                          className="glass-input"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', width: '220px' }}
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          required
                        />
                        <button type="submit" className="glass-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Plus size={14} /> Add Engineer
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Members directory */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                      Registered Team Engineers ({selectedTeam.members.length})
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedTeam.members.map((member, mIdx) => (
                        <span key={mIdx} style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '99px',
                          padding: '4px 12px',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)'
                        }}>
                          {member}
                        </span>
                      ))}
                      {selectedTeam.members.length === 0 && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No members registered. SME Supervisor can add engineer emails.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cases submitted by team */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                      Cases Sent by this Team
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                      {selectedTeamCases.map((c, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedCase(c)}
                          className="glass-panel glass-panel-hover"
                          style={{
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            background: 'rgba(255, 255, 255, 0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                              Site: {c.siteId} // SF Case: {c.sfCase}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Engineer: {c.engineerName} | Created: {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: c.status === 'resolved' ? 'var(--status-low)' : c.status === 'active' ? 'var(--color-secondary)' : 'var(--status-medium)'
                            }}>
                              {c.status}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Click to view details &rarr;</span>
                          </div>
                        </div>
                      ))}
                      {selectedTeamCases.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No request cases logged for this team.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                  Please select a team from the Directory directory to inspect.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Case Details Sidebar / Drawer Panel (Interactive Modal) */}
      {selectedCase && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '500px',
          height: '100vh',
          background: 'rgba(15, 10, 25, 0.98)',
          borderLeft: '1px solid var(--glass-border)',
          zIndex: 99999,
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Case Request Details
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Site ID: {selectedCase.siteId} | SF Case: {selectedCase.sfCase}
              </span>
            </div>
            <button
              onClick={() => setSelectedCase(null)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Details Content */}
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Case Metrics Display */}
            {(() => {
              const metrics = getCaseMetrics(selectedCase, messages);
              return (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(6, 182, 212, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart3 size={14} /> Case Triage Metrics
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', color: '#fff' }}>
                    <div>Total Messages: <strong>{metrics.total}</strong></div>
                    <div>Session Duration: <strong>{metrics.sessionTimeStr}</strong></div>
                    <div>Agent (Engineer): <strong>{metrics.agentMsgs}</strong></div>
                    <div>SME Responses: <strong>{metrics.smeMsgs}</strong></div>
                  </div>
                </div>
              );
            })()}

            {/* Engineer Profile */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                Filing Engineer Profile
              </div>
              <p style={{ fontSize: '0.85rem', color: '#fff', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                Name: <strong>{selectedCase.engineerName}</strong><br />
                Team: <strong>{getCaseTeamName(selectedCase, teams)}</strong>
              </p>
            </div>

            {/* Caller Info & Onsite */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Caller Type
                </div>
                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{selectedCase.caller || 'N/A'}</span>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Present Onsite?
                </div>
                <span style={{ fontSize: '0.85rem', color: selectedCase.presentOnsite === 'Yes' ? 'var(--status-low)' : 'var(--status-critical)', fontWeight: 600 }}>
                  {selectedCase.presentOnsite}
                </span>
              </div>
            </div>

            {/* Wiki Link */}
            {selectedCase.wikiUrl && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Wiki Reference Link
                </div>
                <a
                  href={selectedCase.wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', wordBreak: 'break-all' }}
                >
                  {selectedCase.wikiUrl}
                </a>
              </div>
            )}

            {/* Issue Description */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                Issue Details
              </div>
              <p style={{ fontSize: '0.85rem', color: '#fff', whiteSpace: 'pre-wrap', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--glass-border)', lineHeight: '1.4' }}>
                {selectedCase.issue}
              </p>
            </div>

            {/* Obstacle / Question */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                Obstacle / Specific Question
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--glass-border)', lineHeight: '1.4' }}>
                {selectedCase.question}
              </p>
            </div>

          </div>

          {/* Action Footer */}
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => {
                onEnterWorkspace(selectedCase);
                setSelectedCase(null);
              }}
              className="glass-btn glass-btn-secondary"
              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <MessageSquare size={16} /> Enter Chat Workspace
            </button>

            {/* PDF Downloader Button matching exact requested name format */}
            <button
              onClick={() => generateSessionPDF(selectedCase, messages)}
              className="glass-btn"
              style={{
                width: '100%',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--status-low)',
                color: 'var(--status-low)'
              }}
            >
              <Download size={16} /> Download Enphase@2026 Report
            </button>

            {/* Wipe/Delete Case Report option: Restricted strictly to Managers/Root/Senior Managers only for their respective team cases */}
            {['manager', 'senior_manager', 'root'].includes(userRole) && 
              canAccessTeam(userRole, smeName, getCaseTeamName(selectedCase, teams), teams) && (
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to wipe/delete this engineer case report?")) {
                      onDeleteCase(selectedCase.id);
                      setSelectedCase(null);
                    }
                  }}
                  className="glass-panel"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--status-critical)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={16} /> Wipe Report Database Entry
                </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
