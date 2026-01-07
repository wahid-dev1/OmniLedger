import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currency';

export interface CustomerStatementPDFOptions {
  currency?: string; // Currency code (defaults to PKR)
  company?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    areaCode?: string;
  };
  sales: Array<{
    saleNumber: string;
    saleDate: string;
    totalAmount: number;
    paidAmount: number;
    remainingBalance: number;
    status: string;
    paymentType: string;
  }>;
  summary: {
    totalSales: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  };
  statementDate?: string;
}

export function generateCustomerStatementPDF(options: CustomerStatementPDFOptions): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;
  const currency = options.currency || 'PKR';

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

  // Document Type Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER STATEMENT', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Statement Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Statement Date: ${options.statementDate || new Date().toLocaleDateString()}`,
    pageWidth - margin,
    yPosition,
    { align: 'right' }
  );
  yPosition += 15;

  // Customer Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Information:', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(options.customer.name, margin, yPosition);
  yPosition += 6;

  if (options.customer.address) {
    doc.text(options.customer.address, margin, yPosition);
    yPosition += 6;
  }

  if (options.customer.phone) {
    doc.text(`Phone: ${options.customer.phone}`, margin, yPosition);
    yPosition += 6;
  }

  if (options.customer.email) {
    doc.text(`Email: ${options.customer.email}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // Summary Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Account Summary', margin, yPosition);
  yPosition += 8;

  const summaryData = [
    ['Total Sales', options.summary.totalSales.toString()],
    ['Total Amount', formatCurrency(options.summary.totalAmount, currency, { showSymbol: true })],
    ['Total Paid', formatCurrency(options.summary.totalPaid, currency, { showSymbol: true })],
    ['Outstanding Balance', formatCurrency(options.summary.totalRemaining, currency, { showSymbol: true })],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Summary', 'Amount']],
    body: summaryData,
    theme: 'grid',
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Sales Transactions Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Sales Transactions', margin, yPosition);
  yPosition += 8;

  const tableData = options.sales.map((sale) => [
    sale.saleNumber,
    new Date(sale.saleDate).toLocaleDateString(),
    sale.status.charAt(0).toUpperCase() + sale.status.slice(1).replace('_', ' '),
    sale.paymentType.charAt(0).toUpperCase() + sale.paymentType.slice(1),
    formatCurrency(sale.totalAmount, currency, { showSymbol: true }),
    formatCurrency(sale.paidAmount, currency, { showSymbol: true }),
    formatCurrency(sale.remainingBalance, currency, { showSymbol: true }),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Sale #', 'Date', 'Status', 'Payment', 'Total', 'Paid', 'Balance']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // Footer with company contact details
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Draw footer separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 15, pageWidth - margin, footerY - 15);

  let footerYPos = footerY - 10;
  
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
  const fileName = `CustomerStatement_${options.customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

