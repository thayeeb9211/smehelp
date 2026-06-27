import React, { useState } from 'react';
import { ShieldAlert, Activity, CheckCircle, ArrowRight, User, Folder, Clock, BarChart3, Database, Users, HelpCircle, Download } from 'lucide-react';
import { generateSessionPDF } from '../utils/pdfGenerator';

export default function SmeDashboard({ smeName, cases, messages = [], onAcceptCase, onEnterWorkspace }) {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'analytics'

  // Compute metrics
  const pendingCases = cases.filter(c => c.status === 'pending');
  const activeCases = cases.filter(c => c.status === 'active' && c.smeName === smeName);
  const resolvedCases = cases.filter(c => c.status === 'resolved');

  // Format date helper
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Compile Analytics data
  const engineerStats = {};
  let totalOnsiteCount = 0;
  let totalOffsiteCount = 0;

  cases.forEach(c => {
    // Group by engineer
    if (!engineerStats[c.engineerName]) {
      engineerStats[c.engineerName] = {
        total: 0,
        pending: 0,
        active: 0,
        resolved: 0,
        issues: []
      };
    }
    engineerStats[c.engineerName].total += 1;
    engineerStats[c.engineerName][c.status] += 1;
    engineerStats[c.engineerName].issues.push({
      siteId: c.siteId,
      sfCase: c.sfCase,
      issue: c.issue,
      onsite: c.presentOnsite,
      status: c.status
    });

    // Onsite tracking
    if (c.presentOnsite === 'Yes') {
      totalOnsiteCount += 1;
    } else {
      totalOffsiteCount += 1;
    }
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* Control Hub Navigation & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
            SME Incident Control Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Welcome, Expert <strong style={{ color: 'var(--color-secondary)' }}>{smeName}</strong>. Review triages and review engineering metrics.
          </p>
        </div>

        {/* Tab Selector */}
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
        </div>
      </div>

      {/* Grid of stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
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
      </div>

      {activeTab === 'queue' ? (
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
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>
                        {c.issue}
                      </h3>
                    </div>

                    <button
                      onClick={() => onAcceptCase(c.id, smeName)}
                      className="glass-btn glass-btn-cyan"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      Accept Case <ArrowRight size={14} />
                    </button>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <strong>Obstacle / Question:</strong> {c.question}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> Filer: {c.engineerName}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Present Onsite: {c.presentOnsite}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Filed: {formatDate(c.createdAt)}
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
              Your Active Rooms ({activeCases.length})
            </h2>

            {activeCases.length === 0 ? (
              <div className="glass-panel" style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Accept a case from the queue to start triaging.
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
      ) : (
        /* ANALYTICS CONTROL PANEL VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="fade-in">
          
          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Onsite Breakdown */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
                Onsite Triage Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span>Present Onsite (Yes)</span>
                    <span style={{ fontWeight: 600 }}>{totalOnsiteCount} ({cases.length > 0 ? Math.round((totalOnsiteCount / cases.length) * 100) : 0}%)</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ width: `${cases.length > 0 ? (totalOnsiteCount / cases.length) * 100 : 0}%`, height: '100%', background: 'var(--color-secondary)' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span>Remote / Offsite (No)</span>
                    <span style={{ fontWeight: 600 }}>{totalOffsiteCount} ({cases.length > 0 ? Math.round((totalOffsiteCount / cases.length) * 100) : 0}%)</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ width: `${cases.length > 0 ? (totalOffsiteCount / cases.length) * 100 : 0}%`, height: '100%', background: 'var(--status-medium)' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* General Database Health */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} /> Engineer Escalation Load
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Track case distribution and caller statuses across the active shifts.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Currently logged database index contains: <strong>{cases.length} entries</strong>.
              </div>
            </div>
          </div>

          {/* Engineer case count table & issues breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
            
            {/* Engineer Triage Load */}
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

            {/* Detail Issues Log */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Escalation Issue Register
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {cases.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                    No case records found.
                  </div>
                ) : (
                  cases.map((c, idx) => (
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
                          Site {c.siteId} // Filer: {c.engineerName}
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
                          title="Download PDF Triage Report"
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
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: c.presentOnsite === 'Yes' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: c.presentOnsite === 'Yes' ? 'var(--status-low)' : 'var(--status-critical)',
                          border: c.presentOnsite === 'Yes' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        }}>
                          Onsite: {c.presentOnsite}
                        </span>
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
      )}
    </div>
  );
}
