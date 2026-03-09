import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Bundle, Venue } from './types';

// ── CSV Export ──────────────────────────────────────────────

export function exportCSV(bundle: Bundle, venues: Venue[]) {
    const bundleVenues = venues.filter(v => bundle.venueNames.includes(v['Venue name']));
    const formatCurr = (n: number) => n.toFixed(2);

    const headers = ['Venue Name', 'Site Address', 'Quote No', 'Date', 'Original Value'];
    const rows = bundleVenues.map(v => [
        `"${v['Venue name']}"`,
        `"${v['Site address']}"`,
        v['Quote No'],
        v['Date'],
        formatCurr(v['Sub Total'] || 0),
    ]);

    const totalOriginal = bundleVenues.reduce((s, v) => s + (v['Sub Total'] || 0), 0);
    const discountAmt = totalOriginal * bundle.discount / 100;
    const revisedTotal = totalOriginal - discountAmt;

    rows.push([]);
    rows.push(['', '', '', 'Total Original:', formatCurr(totalOriginal)]);
    if (bundle.discount > 0) {
        rows.push(['', '', '', `Discount (${bundle.discount}%):`, `-${formatCurr(discountAmt)}`]);
    }
    rows.push(['', '', '', 'Revised Total:', formatCurr(revisedTotal)]);

    const csv = [headers.join(','), ...rows.map(r => (r as (string | number)[]).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bundle.name.replace(/[^a-zA-Z0-9]/g, '_')}_bundle.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// ── PDF Export ──────────────────────────────────────────────

export function exportPDF(bundle: Bundle, venues: Venue[]) {
    const bundleVenues = venues.filter(v => bundle.venueNames.includes(v['Venue name']));
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const formatCurr = (n: number) =>
        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

    // ── Header with Workplace Defender branding ──
    const headerY = 12;

    // Company name — bold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Workplace', 14, headerY);
    doc.setFontSize(22);
    doc.text('DEFENDER', 14, headerY + 8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Independently Certified Safety', 14, headerY + 13);

    // Company details — right aligned
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const rightX = pageW - 14;
    doc.text('42 Overseas Drive, Noble Park North Vic 3174', rightX, headerY, { align: 'right' });
    doc.text('New South Wales • Queensland • South Australia • Western Australia', rightX, headerY + 4, { align: 'right' });
    doc.text('T: 1300 013 794  |  Email: enquiries@workplacedefender.com.au', rightX, headerY + 8, { align: 'right' });
    doc.text('A.B.N.: 66 613 167 632', rightX, headerY + 12, { align: 'right' });

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, headerY + 17, pageW - 14, headerY + 17);

    // ── Bundle Title ──
    const titleY = headerY + 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(`Bundle: ${bundle.name}`, 14, titleY);

    // Status badge
    const statusColors: Record<string, [number, number, number]> = {
        draft: [148, 163, 184],
        submitted: [59, 130, 246],
        won: [34, 197, 94],
        lost: [239, 68, 68],
    };
    const statusColor = statusColors[(bundle.status || 'draft')] || statusColors.draft;
    doc.setFillColor(...statusColor);
    const statusText = (bundle.status || 'draft').toUpperCase();
    const statusW = doc.getTextWidth(statusText) + 8;
    const statusX = 14 + doc.getTextWidth(`Bundle: ${bundle.name}`) + 6;
    doc.roundedRect(statusX, titleY - 4, statusW, 6, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(statusText, statusX + 4, titleY - 0.5);

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`, rightX, titleY, { align: 'right' });

    // ── Venue Table ──
    const totalOriginal = bundleVenues.reduce((s, v) => s + (v['Sub Total'] || 0), 0);
    const discountAmt = totalOriginal * bundle.discount / 100;
    const revisedTotal = totalOriginal - discountAmt;

    autoTable(doc, {
        startY: titleY + 6,
        head: [['#', 'Venue Name', 'Site Address', 'Quote No', 'Date', 'Original Value']],
        body: bundleVenues.map((v, i) => [
            i + 1,
            v['Venue name'],
            v['Site address'],
            v['Quote No'],
            v['Date'],
            formatCurr(v['Sub Total'] || 0),
        ]),
        foot: [
            ['', '', '', '', 'Total Original:', formatCurr(totalOriginal)],
            ...(bundle.discount > 0
                ? [['', '', '', '', `Discount (${bundle.discount}%):`, `-${formatCurr(discountAmt)}`]]
                : []),
            ['', '', '', '', 'Revised Total:', formatCurr(revisedTotal)],
        ],
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8.5,
        },
        footStyles: {
            fillColor: [245, 247, 250],
            textColor: [30, 30, 30],
            fontStyle: 'bold',
            fontSize: 9,
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            5: { halign: 'right' },
        },
        margin: { left: 14, right: 14 },
        theme: 'grid',
    });

    // ── Notes (if present) ──
    if (bundle.notes) {
        const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text('Notes:', 14, finalY + 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const splitNotes = doc.splitTextToSize(bundle.notes, pageW - 28);
        doc.text(splitNotes, 14, finalY + 16);
    }

    doc.save(`${bundle.name.replace(/[^a-zA-Z0-9]/g, '_')}_bundle.pdf`);
}
