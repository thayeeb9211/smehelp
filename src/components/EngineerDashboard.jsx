import React, { useState } from 'react';
import { Terminal, Send, History, Calendar, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { generateSessionPDF } from '../utils/pdfGenerator';

export default function EngineerDashboard({ engineerName, cases, messages = [], onCreateCase }) {
  // Find currently open cases for this engineer
  const myOpenCase = cases.find(
    c => c.engineerName === engineerName && (c.status === 'pending' || c.status === 'active')
  );

  // All cases created by this engineer (for history)
  const myCases = cases.filter(c => c.engineerName === engineerName);

  // Form Fields
  const [siteId, setSiteId] = useState('');
  const [sfCase, setSfCase] = useState('');
  const [caller, setCaller] = useState('Installer');
  const [presentOnsite, setPresentOnsite] = useState('Yes');
  const [wikiUrl, setWikiUrl] = useState('http://10.200.48.57/index.php/Microinverters/Troubleshooting/misconfigured-radio-settings');
  const [issue, setIssue] = useState('');
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History filtering state
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'today' | 'week'

  // Filter history cases by date
  const filteredCases = myCases.filter(c => {
    if (historyFilter === 'all') return true;
    
    const createdDate = new Date(c.createdAt);
    const now = new Date();
    
    if (historyFilter === 'today') {
      return createdDate.toDateString() === now.toDateString();
    }
    
    if (historyFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return createdDate >= oneWeekAgo;
    }
    
    return true;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!siteId.trim() || !sfCase.trim() || !issue.trim() || !question.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newCase = {
        id: `case-${Date.now()}`,
        title: `Site ${siteId} // SF-${sfCase}`,
        siteId: siteId.trim(),
        sfCase: sfCase.trim(),
        caller,
        presentOnsite,
        wikiUrl: wikiUrl.trim(),
        issue: issue.trim(),
        question: question.trim(),
        
        // General matching fields for UI compatibility
        severity: 'high',
        category: 'Hardware Triage',
        description: `Site ID: ${siteId}\nSF Case: ${sfCase}\nCaller: ${caller}\nOnsite: ${presentOnsite}\nIssue: ${issue}\nQuestion: ${question}`,
        
        engineerName,
        smeName: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        acceptedAt: null,
        resolvedAt: null
      };

      onCreateCase(newCase);
      setIsSubmitting(false);
      
      // Clear inputs
      setSiteId('');
      setSfCase('');
      setIssue('');
      setQuestion('');
    }, 600);
  };

  return (
    <div className="fade-in" style={{
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr',
      gap: '2rem',
      width: '100%',
      maxWidth: '1300px',
      margin: '0 auto'
    }}>
      
      {/* LEFT PANEL: CASE CREATION OR WAITING MONITOR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {myOpenCase ? (
          <div className="glass-panel" style={{ padding: '2.5rem 2rem', textAlign: 'center', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div className="pulse-glow" style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(147, 51, 234, 0.1)',
                border: '2px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Terminal size={32} className="pulse" style={{ color: 'var(--color-primary)' }} />
              </div>
            </div>
            
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
              Waiting for SME Assignment
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.85rem' }}>
              Your structured incident was broadcasted. A SME will connect to review configuration radio settings.
            </p>

            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Site ID: <strong>{myOpenCase.siteId}</strong></span>
                <span>Case Status: <strong style={{ color: 'var(--color-secondary)' }}>{myOpenCase.status.toUpperCase()}</strong></span>
              </div>
              <h4 style={{ color: '#fff', fontSize: '1rem', marginTop: '4px' }}>Issue: {myOpenCase.issue}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>Obstacle:</strong> {myOpenCase.question}
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Wiki Link: <a href={myOpenCase.wikiUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-secondary)' }}>{myOpenCase.wikiUrl}</a>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              File Technical Escalation
            </h2>
            <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Site ID and SF Case */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Site ID</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="e.g. 6317983"
                    required
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>SF/DB Case Number</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="e.g. 20155486"
                    required
                    value={sfCase}
                    onChange={(e) => setSfCase(e.target.value)}
                  />
                </div>
              </div>

              {/* Caller & Onsite Toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Caller Type</label>
                  <select
                    className="glass-input"
                    value={caller}
                    onChange={(e) => setCaller(e.target.value)}
                    style={{ background: 'rgba(10, 8, 20, 0.6)', cursor: 'pointer' }}
                  >
                    <option value="Installer" style={{ background: '#111' }}>Installer</option>
                    <option value="Host" style={{ background: '#111' }}>Host User</option>
                    <option value="Technician" style={{ background: '#111' }}>Field Technician</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Present Onsite?</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Yes', 'No'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPresentOnsite(opt)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          border: presentOnsite === opt ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
                          background: presentOnsite === opt ? 'rgba(147, 51, 234, 0.1)' : 'transparent',
                          color: presentOnsite === opt ? '#fff' : 'var(--text-secondary)'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Wiki URL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Wiki Reference URL</label>
                <input
                  type="url"
                  className="glass-input"
                  placeholder="e.g. http://10.200.48.57/..."
                  required
                  value={wikiUrl}
                  onChange={(e) => setWikiUrl(e.target.value)}
                />
              </div>

              {/* Issue Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Issue Details</label>
                <textarea
                  className="glass-input"
                  rows="3"
                  placeholder="e.g. IQ8 Micros are Producing but not reporting > PMI looks good but not sure"
                  required
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Question / Blockers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Obstacle / Specific Question</label>
                <textarea
                  className="glass-input"
                  rows="2"
                  placeholder="e.g. WIKI TS done - Not able to upgrade the GW S/W version"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="glass-btn" style={{ width: '100%', marginTop: '4px' }} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : <>Submit & Wait for SME <Send size={14} /></>}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: HISTORICAL INCIDENTS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} /> Request History
          </h2>

          {/* Date range filters */}
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '6px',
            border: '1px solid var(--glass-border)',
            padding: '2px'
          }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Week' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setHistoryFilter(tab.id)}
                style={{
                  background: historyFilter === tab.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  color: historyFilter === tab.id ? '#fff' : 'var(--text-secondary)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Case History List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {filteredCases.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No logged cases found for the selected time range.
            </div>
          ) : (
            filteredCases.map(c => (
              <div
                key={c.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  borderLeft: c.status === 'resolved' ? '4px solid var(--status-low)' : c.status === 'active' ? '4px solid var(--color-secondary)' : '4px solid var(--status-medium)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateSessionPDF(c, messages);
                      }}
                      title="Download PDF Triage Report"
                      className="glass-panel"
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(147, 51, 234, 0.1)',
                        border: '1px solid rgba(147, 51, 234, 0.3)',
                        color: '#fff',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.7rem'
                      }}
                    >
                      <Download size={10} /> Report PDF
                    </button>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: c.status === 'resolved' ? 'var(--status-low)' : c.status === 'active' ? 'var(--color-secondary)' : 'var(--status-medium)'
                    }}>
                      {c.status}
                    </span>
                  </div>
                </div>

                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                  Site: {c.siteId} ↔ SF Case: {c.sfCase}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Issue:</strong> {c.issue}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--glass-border)',
                  paddingTop: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <span>SME: <strong>{c.smeName || 'Unassigned'}</strong></span>
                  <span>Onsite: <strong>{c.presentOnsite}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
