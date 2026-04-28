import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  fire: [239, 68, 68],
  medical: [6, 182, 212],
  security: [245, 158, 11],
  hazard: [234, 179, 8],
  black: [10, 12, 16],
  gray: [120, 120, 130],
  emerald: [16, 185, 129],
  red: [220, 38, 38],
};

const fmtTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour12: false });
const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const fmtDuration = (start, end) => {
  const ms = (end || Date.now()) - start;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

export function generateIncidentReport({
  incident,
  responders = [],
  families = [],
  ppsScore = null,
  reportedBy = 'Tactical Command',
}) {
  if (!incident) {
    console.error('generateIncidentReport: incident required');
    return;
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const accent = COLORS[incident.type] || COLORS.fire;

  // ===== HEADER BAND =====
  doc.setFillColor(...COLORS.black);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFillColor(...accent);
  doc.rect(0, 28, pageW, 2, 'F');
  doc.setFillColor(...accent);
  doc.circle(15, 14, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RESQNET', 22, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 190);
  doc.text('TACTICAL EMERGENCY RESPONSE PLATFORM', 22, 18);

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('INCIDENT REPORT', pageW - 14, 13, { align: 'right' });
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 190);
  doc.text(`Generated ${fmtDate(Date.now())} ${fmtTime(Date.now())}`, pageW - 14, 18, { align: 'right' });

  // ===== INCIDENT TITLE =====
  let y = 42;
  doc.setTextColor(...accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(incident.type.toUpperCase(), 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  doc.text(`Zone: ${(incident.zone || '').replace('_', ' ').toUpperCase()}`, 14, y + 7);

  const isResolved = !!incident.endedAt;
  doc.setFillColor(...(isResolved ? COLORS.emerald : COLORS.red));
  doc.roundedRect(pageW - 50, y - 6, 36, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(isResolved ? 'RESOLVED' : 'ACTIVE', pageW - 32, y, { align: 'center' });

  y += 16;

  // ===== KEY METRICS =====
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.2);
  doc.line(14, y, pageW - 14, y);
  y += 6;

  const metrics = [
    { label: 'INCIDENT ID', value: incident.id?.slice(0, 8) || 'N/A' },
    { label: 'SEVERITY', value: `LEVEL ${incident.severity || 0}` },
    { label: 'DURATION', value: fmtDuration(incident.startedAt, incident.endedAt) },
    { label: 'STARTED', value: fmtTime(incident.startedAt) },
  ];
  if (ppsScore != null) metrics.push({ label: 'PEAK PPS', value: String(ppsScore) });

  const colW = (pageW - 28) / metrics.length;
  metrics.forEach((m, i) => {
    const x = 14 + i * colW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    doc.text(m.label, x, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.black);
    doc.text(String(m.value), x, y + 6);
  });
  y += 14;

  doc.line(14, y, pageW - 14, y);
  y += 8;

  // ===== EVENT TIMELINE =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.black);
  doc.text('EVENT TIMELINE', 14, y);
  y += 4;

  const events = incident.events || [];
  if (events.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['TIME', 'EVENT', 'DETAIL']],
      body: events.map(e => [
        fmtTime(e.t),
        (e.kind || '').replace('_', ' '),
        e.detail || '—',
      ]),
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLORS.black, textColor: 255, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      columnStyles: {
        0: { cellWidth: 25, font: 'courier', fontSize: 8 },
        1: { cellWidth: 40, fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text('No events logged.', 14, y + 5);
    y += 12;
  }

  // ===== RESPONDERS =====
  if (responders.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.black);
    doc.text('RESPONDERS DISPATCHED', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['ID', 'NAME', 'ROLE', 'ZONE', 'STATUS']],
      body: responders.map(r => [
        r.id,
        r.name,
        r.role,
        (r.zone || '').replace('_', ' '),
        r.status,
      ]),
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLORS.black, textColor: 255, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ===== EVACUATION =====
  const allGuests = families.flatMap(f => f.members || []);
  if (allGuests.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.black);
    doc.text('EVACUATION VERIFICATION', 14, y);
    y += 6;

    const evacuated = allGuests.filter(g => g.evacuated).length;
    const total = allGuests.length;
    const pct = (evacuated / Math.max(1, total)) * 100;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...COLORS.emerald);
    doc.text(`${evacuated} / ${total}`, 14, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text('GUESTS ACCOUNTED FOR', 14, y + 14);

    const barW = pageW - 80;
    const barX = 60;
    const barY = y + 5;
    doc.setFillColor(235, 235, 240);
    doc.roundedRect(barX, barY, barW, 4, 1, 1, 'F');
    doc.setFillColor(...COLORS.emerald);
    doc.roundedRect(barX, barY, (barW * pct) / 100, 4, 1, 1, 'F');

    y += 22;

    autoTable(doc, {
      startY: y,
      head: [['GUEST ID', 'NAME', 'AGE', 'DEVICE', 'ZONE', 'STATUS']],
      body: allGuests.map(g => [
        g.id,
        g.name,
        String(g.age),
        g.hasBand ? 'BAND' : 'APP',
        (g.zone || '').replace('_', ' '),
        g.evacuated ? 'SAFE' : 'IN ZONE',
      ]),
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLORS.black, textColor: 255, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'SAFE') data.cell.styles.textColor = COLORS.emerald;
          else data.cell.styles.textColor = COLORS.red;
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'BAND') data.cell.styles.textColor = COLORS.emerald;
          else data.cell.styles.textColor = [59, 130, 246];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ===== FOOTER =====
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220, 220, 225);
    doc.setLineWidth(0.2);
    doc.line(14, ph - 12, pageW - 14, ph - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    doc.text('ResQnet · Confidential Incident Report', 14, ph - 7);
    doc.text(`Reported by: ${reportedBy}`, pageW / 2, ph - 7, { align: 'center' });
    doc.text(`Page ${i} / ${pageCount}`, pageW - 14, ph - 7, { align: 'right' });
  }

  const filename = `resqnet-incident-${incident.type}-${incident.id?.slice(0, 6) || 'report'}.pdf`;
  doc.save(filename);
}
