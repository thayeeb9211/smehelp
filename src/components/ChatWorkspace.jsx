import React, { useState, useRef, useEffect } from 'react';
import { FileText, Send, CheckCircle, ChevronLeft, Download, Paperclip, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCw, X } from 'lucide-react';
import { generateSessionPDF } from '../utils/pdfGenerator';

export default function ChatWorkspace({ user, activeCase, messages, onSendMessage, onResolveCase, onBack }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]); // Array of { name, type, data }
  const [isEnlarged, setIsEnlarged] = useState(false);
  const chatEndRef = useRef(null);

  // Lightbox & Zoom/Pan State
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Filter messages for this specific case
  const chatMessages = messages.filter(m => m.caseId === activeCase.id);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    
    // Check limit
    if (files.length + uploadedFiles.length > 10) {
      alert("You can upload a maximum of 10 documents.");
      return;
    }

    uploadedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFiles(prev => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            data: reader.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!text.trim() && files.length === 0) return;

    // Send files array as the media parameter
    onSendMessage(activeCase.id, user.name, user.role, text.trim(), files.length > 0 ? files : null);
    setText('');
    setFiles([]);
  };

  const handleExportPDF = () => {
    // Generate PDF; mapping media files for pdfGenerator compat
    // For legacy generator compatibility, if media is an array, we grab first image or describe it.
    generateSessionPDF(activeCase, chatMessages);
  };

  // Lightbox Zoom & Pan Handlers
  const handleImageClick = (imgSrc) => {
    setActiveLightboxImg(imgSrc);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
          {activeCase.waitDuration && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--glass-border)', paddingTop: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Wait Time</span>
              <strong style={{ color: 'var(--color-secondary)' }}>{activeCase.waitDuration}</strong>
            </div>
          )}
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
                  
                  {/* Multi-document attachments rendering */}
                  {msg.media && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      {(Array.isArray(msg.media) ? msg.media : [{ name: 'Image Attachment', type: 'image/png', data: msg.media }]).map((fileObj, fIdx) => {
                        const isImg = fileObj.type ? fileObj.type.startsWith('image/') : true;
                        if (isImg) {
                          return (
                            <img
                              key={fIdx}
                              src={fileObj.data || fileObj}
                              alt={fileObj.name || "Image attachment"}
                              onClick={() => handleImageClick(fileObj.data || fileObj)}
                              style={{
                                maxWidth: '180px',
                                maxHeight: '130px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'zoom-in',
                                transition: 'transform 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            />
                          );
                        } else {
                          return (
                            <a
                              key={fIdx}
                              href={fileObj.data}
                              download={fileObj.name}
                              className="glass-panel"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                color: 'var(--color-secondary)',
                                textDecoration: 'none',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.03)'
                              }}
                            >
                              <FileText size={16} />
                              <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {fileObj.name}
                              </span>
                              <Download size={12} style={{ marginLeft: '4px', color: 'var(--text-secondary)' }} />
                            </a>
                          );
                        }
                      })}
                    </div>
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
          {/* Files Upload Previews */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '4px 0', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '4px' }}>
              {files.map((f, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--glass-border)'
                }}>
                  {f.type.startsWith('image/') ? (
                    <img src={f.data} style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }} alt="Preview" />
                  ) : (
                    <FileText size={16} style={{ color: 'var(--color-secondary)' }} />
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                    style={{ background: 'transparent', border: 'none', color: 'var(--status-critical)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <label className="glass-panel glass-panel-hover" style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              borderRadius: '10px',
              marginBottom: '0'
            }}>
              <Paperclip size={18} />
              <input
                type="file"
                multiple
                accept="image/*,application/pdf,text/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>

            {/* Teams-like expandable textarea typing screen */}
            <textarea
              className="glass-input"
              rows={isEnlarged ? 4 : 1}
              style={{
                flex: 1,
                minHeight: isEnlarged ? '120px' : '40px',
                height: isEnlarged ? '120px' : '40px',
                maxHeight: '200px',
                resize: 'vertical',
                padding: '10px 12px',
                lineHeight: '1.4',
                fontFamily: 'inherit',
                borderRadius: '10px',
                background: 'rgba(10, 8, 20, 0.6)',
                overflowY: 'auto'
              }}
              placeholder={activeCase.status === 'resolved' ? "Case is resolved. You can still message..." : "Type system updates or chat..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Enlarge/Collapse button */}
            <button
              type="button"
              onClick={() => setIsEnlarged(!isEnlarged)}
              className="glass-panel"
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'transparent',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                borderRadius: '10px'
              }}
              title={isEnlarged ? "Collapse typing box" : "Enlarge typing box"}
            >
              {isEnlarged ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button type="submit" className="glass-btn" style={{ width: '40px', height: '40px', padding: '0', borderRadius: '10px' }}>
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* Lightbox / Zoomable Image Viewer Component */}
      {activeLightboxImg && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.92)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseUp={handleMouseUp}
        >
          {/* Lightbox Controls */}
          <div style={{
            position: 'absolute',
            top: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            zIndex: 100000,
            background: 'rgba(20, 15, 30, 0.6)',
            border: '1px solid var(--glass-border)',
            padding: '6px 18px',
            borderRadius: '99px',
            backdropFilter: 'blur(10px)'
          }}>
            <button onClick={handleZoomIn} className="glass-panel" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'transparent', color: '#fff', border: 'none' }} title="Zoom In">
              <ZoomIn size={16} />
            </button>
            <button onClick={handleZoomOut} className="glass-panel" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'transparent', color: '#fff', border: 'none' }} title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <button onClick={handleZoomReset} className="glass-panel" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'transparent', color: '#fff', border: 'none' }} title="Reset View">
              <RefreshCw size={14} />
            </button>
            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }}></div>
            <button onClick={() => setActiveLightboxImg(null)} className="glass-panel" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'transparent', color: 'var(--status-critical)', border: 'none' }} title="Close">
              <X size={16} />
            </button>
          </div>

          {/* Lightbox Image Container (Pannable) */}
          <div
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          >
            <img
              src={activeLightboxImg}
              alt="Zoomed attachment"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                maxHeight: '90%',
                maxWidth: '90%',
                objectFit: 'contain',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
