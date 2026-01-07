import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFTableColumn {
  header: string;
  dataKey: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
}

export interface PDFTableData {
  [key: string]: string | number;
}

export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  dateRange?: { from: string; to: string };
  summary?: Array<{ label: string; value: string | number }>;
  columns: PDFTableColumn[];
  data: PDFTableData[];
  footer?: string;
  company?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export function generatePDFReport(options: PDFReportOptions): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Company Header
  if (options.company && options.company.name) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(options.company.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    if (options.company.address && options.company.address.trim()) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(options.company.address, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
    }

    const contactInfo: string[] = [];
    if (options.company.phone && options.company.phone.trim()) {
      contactInfo.push(`Phone: ${options.company.phone}`);
    }
    if (options.company.email && options.company.email.trim()) {
      contactInfo.push(`Email: ${options.company.email}`);
    }
    
    if (contactInfo.length > 0) {
      doc.setFontSize(9);
      doc.text(contactInfo.join(' | '), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
    }

    // Draw separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
  }

  // Add report title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Add subtitle
  if (options.subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(options.subtitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  }

  // Add date range
  if (options.dateRange) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const dateText = `${new Date(options.dateRange.from).toLocaleDateString()} - ${new Date(options.dateRange.to).toLocaleDateString()}`;
    doc.text(dateText, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  }

  // Add generated date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Add summary cards if provided
  if (options.summary && options.summary.length > 0) {
    const cardWidth = (pageWidth - 2 * margin - (options.summary.length - 1) * 10) / options.summary.length;
    let xPosition = margin;

    options.summary.forEach((item, index) => {
      if (index > 0) {
        xPosition += cardWidth + 10;
      }

      // Draw box
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(xPosition, yPosition, cardWidth, 20);

      // Label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, xPosition + 5, yPosition + 8);

      // Value
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const valueText = typeof item.value === 'number' 
        ? (item.value % 1 === 0 ? item.value.toString() : item.value.toFixed(2))
        : item.value.toString();
      doc.text(valueText, xPosition + 5, yPosition + 16);
    });

    yPosition += 30;
  }

  // Prepare table data
  const tableData = options.data.map(row => 
    options.columns.map(col => {
      const value = row[col.dataKey];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'number') {
        return value % 1 === 0 ? value.toString() : value.toFixed(2);
      }
      return value.toString();
    })
  );

  // Add table
  autoTable(doc, {
    startY: yPosition,
    head: [options.columns.map(col => col.header)],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: options.columns.reduce((acc, col, index) => {
      acc[index] = {
        cellWidth: col.width ? col.width : 'auto',
        halign: col.align || 'left',
      };
      return acc;
    }, {} as { [key: number]: any }),
    margin: { left: margin, right: margin },
    styles: {
      cellPadding: 3,
      fontSize: 9,
    },
    foot: options.data.length > 0 ? [['Total', ...options.columns.slice(1).map(() => '')]] : undefined,
  });

  // Footer with company contact details
  const finalY = (doc as any).lastAutoTable?.finalY || pageHeight - 40;
  const footerY = pageHeight - 20;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Draw footer separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 15, pageWidth - margin, footerY - 15);

  let footerYPos = footerY - 10;
  
  // Custom footer text if provided
  if (options.footer) {
    doc.setFont('helvetica', 'italic');
    doc.text(options.footer, pageWidth / 2, footerYPos, { align: 'center' });
    footerYPos -= 5;
  }
  
  // Company contact details in footer
  if (options.company && options.company.name) {
    const footerLines: string[] = [];
    if (options.company.name && options.company.name.trim()) {
      footerLines.push(options.company.name);
    }
    if (options.company.address && options.company.address.trim()) {
      footerLines.push(options.company.address);
    }
    
    const contactFooter: string[] = [];
    if (options.company.phone && options.company.phone.trim()) {
      contactFooter.push(`Tel: ${options.company.phone}`);
    }
    if (options.company.email && options.company.email.trim()) {
      contactFooter.push(`Email: ${options.company.email}`);
    }
    
    if (footerLines.length > 0) {
      doc.setFont('helvetica', 'bold');
      footerLines.forEach((line) => {
        doc.text(line, pageWidth / 2, footerYPos, { align: 'center' });
        footerYPos -= 5;
      });
    }
    
    if (contactFooter.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text(contactFooter.join(' | '), pageWidth / 2, footerYPos, { align: 'center' });
      footerYPos -= 5;
    }
  }
  
  // Generated date
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    footerYPos,
    { align: 'center' }
  );

  // Save PDF
  const fileName = `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

