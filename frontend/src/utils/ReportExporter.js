import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

class ReportExporter {
  /**
   * Compiles JSON rows into a multi-tab Excel spreadsheet and triggers browser download.
   */
  static exportToExcel({ filename, sheets = [] }) {
    if (!sheets || sheets.length === 0) {
      throw new Error('No sheet data provided for export.');
    }

    const workbook = XLSX.utils.book_new();

    sheets.forEach(({ name, data, headers, columnWidths }) => {
      // 1. Header row
      const wsData = [headers.map(h => h.label)];
      
      // 2. Data rows
      data.forEach(row => {
        const rowData = headers.map(h => {
          const val = row[h.field];
          return h.format ? h.format(val) : (val ?? '');
        });
        wsData.push(rowData);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(wsData);

      // 3. Set custom or auto column widths
      if (columnWidths && Array.isArray(columnWidths)) {
        worksheet['!cols'] = columnWidths.map(w => ({ wch: w }));
      } else {
        const colWidths = headers.map((h, i) => {
          let maxLen = h.label.length;
          data.forEach(row => {
            const val = String(row[h.field] ?? '');
            if (val.length > maxLen) maxLen = val.length;
          });
          return { wch: Math.max(maxLen + 4, 18) };
        });
        worksheet['!cols'] = colWidths;
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, name.substring(0, 31));
    });

    XLSX.writeFile(workbook, `${filename || 'Financial_Closing_Report'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Generates a professional, vector-clean A4 PDF report document using jsPDF & autoTable.
   */
  static exportVectorPDF({ title, companyName, period, status, summaryData = [], exceptionData = [], checklistData = [], filename }) {
    const doc = new jsPDF('portrait', 'mm', 'a4');

    // 1. Header Title Banner
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title || 'FINANCIAL CLOSING & COMPLIANCE REPORT', 14, 11);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${companyName || 'Company'} | Period: ${period || 'Current Period'} | Status: ${status || 'Draft'}`, 14, 18);

    let startY = 30;

    // 2. Executive & Financial Summary Table
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Executive & Financial Reconciliation Summary', 14, startY);

    autoTable(doc, {
      startY: startY + 3,
      head: [['Category', 'Metric / Financial Item', 'Amount / Value (INR)', 'Audit Status']],
      body: summaryData.map(d => [d.category, d.metric, typeof d.value === 'number' ? `INR ${d.value.toLocaleString('en-IN')}` : String(d.value), d.note]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 55 },
        2: { cellWidth: 45, fontStyle: 'bold' },
        3: { cellWidth: 40 }
      },
      margin: { left: 14, right: 14 }
    });

    startY = doc.lastAutoTable.finalY + 9;

    // 3. Actionable Exceptions Table
    if (startY > 230) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Actionable Compliance Exceptions', 14, startY);

    const excRows = (exceptionData && exceptionData.length > 0)
      ? exceptionData.map(e => [e.severity, e.module, e.party, e.message, e.action])
      : [['CLEAN', 'System', 'N/A', 'No exceptions detected. All registers are audit-ready.', 'None']];

    autoTable(doc, {
      startY: startY + 3,
      head: [['Severity', 'Module', 'Party / Voucher', 'Exception Description', 'Required Action']],
      body: excRows,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 20 },
        2: { cellWidth: 45 },
        3: { cellWidth: 67 },
        4: { cellWidth: 30, fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 0) {
          if (data.cell.raw === 'CRITICAL') data.cell.styles.textColor = [225, 29, 72];
          else if (data.cell.raw === 'HIGH') data.cell.styles.textColor = [217, 119, 6];
          else if (data.cell.raw === 'MEDIUM') data.cell.styles.textColor = [37, 99, 235];
        }
      },
      margin: { left: 14, right: 14 }
    });

    startY = doc.lastAutoTable.finalY + 9;

    // 4. Month-End Checklist Status
    if (startY > 230) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Month-End Verification Checklist & Period Lock Status', 14, startY);

    autoTable(doc, {
      startY: startY + 3,
      head: [['Checklist Verification Item', 'Validation Status']],
      body: checklistData.map(c => [c.item, c.status]),
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 62, fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    // Footer / Page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${pageCount} — Financial Closing & Compliance Framework`, 14, 287);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 155, 287);
    }

    doc.save(`${filename || 'Financial_Closing_Report'}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  /**
   * Triggers the native browser print rendering pipeline with print media stylesheets.
   */
  static triggerPrint() {
    const style = document.createElement('style');
    style.id = 'fccf-print-stylesheet';
    style.innerHTML = `
      @media print {
        body {
          background: #ffffff !important;
          color: #000000 !important;
          font-size: 11pt !important;
        }
        .no-print, button, nav, header, aside {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
        .bg-slate-50\\/50 {
          background: none !important;
        }
        .shadow-sm, .shadow-md, .shadow-lg {
          box-shadow: none !important;
        }
        .border {
          border: 1px solid #e2e8f0 !important;
        }
        tr {
          page-break-inside: avoid !important;
        }
        @page {
          size: A4 portrait;
          margin: 1.5cm;
        }
      }
    `;
    document.head.appendChild(style);
    
    window.print();
    
    setTimeout(() => {
      const el = document.getElementById('fccf-print-stylesheet');
      if (el) el.remove();
    }, 1000);
  }
}

export default ReportExporter;
