import { jsPDF } from 'jspdf';

export function generateSessionPDF(caseDetail, messages) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let y = 30;

  // Helper: check page bounds and add new page
  const checkPageBreak = (heightNeeded) => {
    if (y + heightNeeded > pageHeight - margin - 15) {
      doc.addPage();
      y = 30;
      drawHeaderFooter();
      return true;
    }
    return false;
  };

  // Helper: draw professional header & footer
  const drawHeaderFooter = () => {
    // Header Line and logo text
    doc.setDrawColor(124, 58, 237); // Purple accent
    doc.setLineWidth(0.8);
    doc.line(margin, 15, pageWidth - margin, 15);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('SMEHELP // COLLABORATION & TRIAGE SYSTEM', margin, 12);
    
    const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
    doc.text(`PAGE ${pageNum}`, pageWidth - margin - 12, 12);

    // Footer
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text('CONFIDENTIAL // INTERNAL ENGINEERING USE ONLY', margin, pageHeight - 13);
    doc.text(`GENERATED ON ${new Date().toLocaleString()}`, pageWidth - margin - 48, pageHeight - 13);
  };

  // Initial header
  drawHeaderFooter();

  // Report Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('Incident Triage Report', margin, y);
  y += 10;

  // Metadata Box
  const boxHeight = 36;
  doc.setFillColor(248, 250, 252); // Slate-50 (Very light background)
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageWidth - 2 * margin, boxHeight, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('Helvetica', 'bold');

  // Labels
  doc.text('SITE ID:', margin + 6, y + 8);
  doc.text('SF/DB CASE:', margin + 6, y + 16);
  doc.text('CALLER TYPE:', margin + 6, y + 24);
  doc.text('PRESENT ONSITE:', margin + 6, y + 30);

  doc.text('ENGINEER:', margin + 90, y + 8);
  doc.text('SME ASSIGNED:', margin + 90, y + 16);
  doc.text('DATE FILED:', margin + 90, y + 24);
  doc.text('STATUS:', margin + 90, y + 30);

  // Values
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(String(caseDetail.siteId || 'N/A'), margin + 35, y + 8);
  doc.text(String(caseDetail.sfCase || 'N/A'), margin + 35, y + 16);
  doc.text(String(caseDetail.caller || 'N/A'), margin + 35, y + 24);
  
  const onsiteVal = caseDetail.presentOnsite || 'No';
  if (onsiteVal === 'Yes') {
    doc.setTextColor(16, 185, 129); // Modern Emerald Green
    doc.setFont('Helvetica', 'bold');
  } else {
    doc.setTextColor(239, 68, 68); // Modern Rose Red
  }
  doc.text(onsiteVal, margin + 35, y + 30);
  
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  doc.text(caseDetail.engineerName || 'N/A', margin + 120, y + 8);
  doc.text(caseDetail.smeName || 'Not Joined', margin + 120, y + 16);
  
  const createdDate = caseDetail.createdAt ? new Date(caseDetail.createdAt).toLocaleString() : 'N/A';
  doc.text(createdDate, margin + 120, y + 24);
  
  const statusStr = (caseDetail.status || 'pending').toUpperCase();
  if (statusStr === 'RESOLVED') {
    doc.setTextColor(16, 185, 129);
    doc.setFont('Helvetica', 'bold');
  } else if (statusStr === 'ACTIVE') {
    doc.setTextColor(6, 182, 212);
    doc.setFont('Helvetica', 'bold');
  } else {
    doc.setTextColor(245, 158, 11);
    doc.setFont('Helvetica', 'bold');
  }
  doc.text(statusStr, margin + 120, y + 30);

  y += boxHeight + 10;

  // Title block helper
  const drawSectionTitle = (title) => {
    checkPageBreak(15);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(124, 58, 237); // Purple accent
    doc.text(title.toUpperCase(), margin, y);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 2.5, pageWidth - margin, y + 2.5);
    y += 9;
  };

  // Section 1: Wiki Reference Link
  if (caseDetail.wikiUrl) {
    drawSectionTitle('Wiki Reference Link');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(6, 182, 212); // Cyan URL style
    doc.text(caseDetail.wikiUrl || 'N/A', margin, y);
    y += 10;
  }

  // Section 2: Issue Statement
  drawSectionTitle('Issue Description');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85); // Slate-700
  const issueLines = doc.splitTextToSize(caseDetail.issue || 'No details provided.', pageWidth - 2 * margin);
  issueLines.forEach(line => {
    checkPageBreak(5);
    doc.text(line, margin, y);
    y += 5;
  });
  y += 6;

  // Section 3: Question / Obstacle
  drawSectionTitle('Specific Obstacle & Question');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85); // Slate-700
  const questionLines = doc.splitTextToSize(caseDetail.question || 'No question provided.', pageWidth - 2 * margin);
  questionLines.forEach(line => {
    checkPageBreak(5);
    doc.text(line, margin, y);
    y += 5;
  });
  y += 8;

  // Section 4: Chat Transcript
  drawSectionTitle('Collaboration Transcript');

  const chatMessages = messages.filter(m => m.caseId === caseDetail.id);
  if (chatMessages.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text('No collaboration chat messages logged in this session.', margin, y);
    y += 6;
  } else {
    chatMessages.forEach(msg => {
      // Header for each message block
      const rolePrefix = msg.senderRole ? `[${msg.senderRole.toUpperCase()}] ` : '';
      const headerText = `${rolePrefix}${msg.senderName} (${msg.timestamp || ''}):`;
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      
      if (msg.senderRole === 'system') {
        doc.setTextColor(147, 51, 234);
      } else if (msg.senderRole === 'sme') {
        doc.setTextColor(6, 182, 212);
      } else {
        doc.setTextColor(15, 23, 42); // Engineer/default user
      }

      checkPageBreak(12);
      doc.text(headerText, margin, y);
      y += 4.5;

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9.5);
      
      if (msg.text) {
        // Draw bubble backgrounds or indented lines
        const textLines = doc.splitTextToSize(msg.text, pageWidth - 2 * margin - 8);
        
        // Soft border/padding background left bar
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(1.5);
        doc.line(margin + 2, y - 2, margin + 2, y + (textLines.length * 4.8) - 2);

        textLines.forEach(line => {
          checkPageBreak(4.8);
          doc.text(line, margin + 6, y);
          y += 4.8;
        });
      }

      // Add attached images if any
      if (msg.media && typeof msg.media === 'string' && msg.media.startsWith('data:image')) {
        checkPageBreak(52);
        try {
          doc.addImage(msg.media, 'JPEG', margin + 6, y, 60, 45);
          y += 48;
        } catch (e) {
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(239, 68, 68);
          doc.text('[Image attached, but could not compile to PDF]', margin + 6, y);
          y += 5;
        }
      }
      y += 4; // Padding between messages
    });
  }

  const filename = `Escalation_Report_Site_${caseDetail.siteId || 'export'}.pdf`;
  doc.save(filename);
}
