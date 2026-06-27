import React, { useState, useRef, useEffect } from 'react';
import { FileText, Send, Image as ImageIcon, CheckCircle, ChevronLeft, Download, Paperclip, ExternalLink } from 'lucide-react';
import { generateSessionPDF } from '../utils/pdfGenerator';

export default function ChatWorkspace({ user, activeCase, messages, onSendMessage, onResolveCase, onBack }) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState(null);
  const chatEndRef = useRef(null);

  // Filter messages for this specific case
  const chatMessages = messages.filter(m => m.caseId === activeCase.id);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMedia(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() && !media) return;

    onSendMessage(activeCase.id, user.name, user.role, text.trim(), media);
    setText('');
    setMedia(null);
  };

  const handleExportPDF = () => {
    generateSessionPDF(activeCase, chatMessages);
  };

  return (
    <div className="fade-in" style={{
      display: 'grid',
      gridTemplateColumns: '380px 1fr',
      gap: '1.5rem',
      height: 'calc(100vh - 120px)',
      width: '100%',
    }}>
      
      {/* Left Panel: Structured Case Details */}
      <div className="glass-panel" style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onBack}
            className="glass-panel"
            style={{
              padding: '6px',
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'inherit',
              border: '1px solid var(--glass-border)',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Incident Profile</span>
        </div>

        {/* Structured Info Card */}
        <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Site ID</span>
            <strong style={{ color: '#fff' }}>{activeCase.siteId}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>SF/DB Case</span>
            <strong style={{ color: '#fff' }}>{activeCase.sfCase}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Caller</span>
            <strong style={{ color: '#fff' }}>{activeCase.caller}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Present Onsite?</span>
            <strong style={{ color: activeCase.presentOnsite === 'Yes' ? 'var(--status-low)' : 'var(--status-critical)' }}>
              {activeCase.presentOnsite}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Wiki Link */}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
              Wiki Troubleshooting Reference
            </div>
            <a
              href={activeCase.wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel glass-panel-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                fontSize: '0.8rem',
                color: 'var(--color-secondary)',
                textDecoration: 'none'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                {activeCase.wikiUrl}
              </span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Issue Statement */}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
              Issue Details
            </div>
            <p style={{ fontSize: '0.85rem', color: '#fff', whiteSpace: 'pre-wrap', lineHeight: 1.4, padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              {activeCase.issue}
            </p>
          </div>

          {/* Obstacle / Question */}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
              Obstacle / Question
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.4, padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              {activeCase.question}
            </p>
          </div>

          {activeCase.media && (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                Filer Attachment
              </div>
              <img
                src={activeCase.media}
                alt="Case Attachment"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--glass-border)', objectFit: 'contain', maxHeight: '180px' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Chat Workspace */}
      <div className="glass-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--glass-border)',
          background: 'rgba(10, 8, 20, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff' }}>
                Triage Room
              </h3>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: activeCase.status === 'resolved' ? 'var(--status-low)' : 'var(--color-secondary)',
                border: activeCase.status === 'resolved' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(6, 182, 212, 0.3)',
                background: activeCase.status === 'resolved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                padding: '2px 8px',
                borderRadius: '99px',
                textTransform: 'uppercase'
              }}>
                {activeCase.status}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Engineer: <strong style={{ color: '#fff' }}>{activeCase.engineerName}</strong> ↔ SME: <strong style={{ color: '#fff' }}>{activeCase.smeName || 'Connecting...'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Resolution button for SME */}
            {user.role === 'sme' && activeCase.status !== 'resolved' && (
              <button
                onClick={() => onResolveCase(activeCase.id)}
                className="glass-btn glass-btn-cyan"
                style={{ padding: '8px 14px', fontSize: '0.8rem' }}
              >
                <CheckCircle size={14} /> Resolve Case
              </button>
            )}

            {/* Export PDF */}
            <button
              onClick={handleExportPDF}
              className="glass-btn"
              style={{
                padding: '8px 14px',
                fontSize: '0.8rem',
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
              }}
            >
              <Download size={14} /> Export Report PDF
            </button>
          </div>
        </div>

        {/* Chat Message Window */}
        <div style={{
          flex: 1,
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'rgba(5, 3, 10, 0.2)'
        }}>
          {chatMessages.map((msg) => {
            const isMe = msg.senderName === user.name;
            const isSystem = msg.senderRole === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                  <div style={{
                    background: 'rgba(147, 51, 234, 0.1)',
                    border: '1px solid rgba(147, 51, 234, 0.2)',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {msg.text} <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginLeft: '6px' }}>{msg.timestamp}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Sender Tag */}
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: msg.senderRole === 'sme' ? 'var(--color-secondary)' : 'var(--color-primary)',
                  marginBottom: '4px',
                  marginLeft: isMe ? '0' : '4px',
                  marginRight: isMe ? '4px' : '0',
                }}>
                  {msg.senderName} ({msg.senderRole.toUpperCase()})
                </div>

                {/* Message Bubble */}
                <div className="glass-panel" style={{
                  padding: '10px 14px',
                  borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  background: isMe ? 'rgba(147, 51, 234, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: isMe ? '1px solid rgba(147, 51, 234, 0.3)' : '1px solid var(--glass-border)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {msg.text && <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>}
                  {msg.media && (
                    <img
                      src={msg.media}
                      alt="Shared attachment"
                      style={{ maxWidth: '300px', maxHeight: '200px', objectFit: 'contain', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  )}
                </div>

                {/* Time Tag */}
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                  {msg.timestamp}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--glass-border)',
          background: 'rgba(10, 8, 20, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {media && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', width: 'fit-content' }}>
              <img src={media} alt="Upload preview" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Image attached</span>
              <button
                type="button"
                onClick={() => setMedia(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--status-critical)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
              >
                ×
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label className="glass-panel glass-panel-hover" style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              borderRadius: '10px'
            }}>
              <Paperclip size={18} />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>

            <input
              type="text"
              className="glass-input"
              style={{ flex: 1, height: '40px' }}
              placeholder={activeCase.status === 'resolved' ? "Case is resolved. You can still message..." : "Type system updates or chat..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <button type="submit" className="glass-btn" style={{ width: '40px', height: '40px', padding: '0', borderRadius: '10px' }}>
              <Send size={16} />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
