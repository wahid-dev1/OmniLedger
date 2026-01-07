import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currency';

export interface InvoicePDFOptions {
  type: 'sale' | 'purchase';
  documentNumber: string;
  date: string;
  currency?: string; // Currency code (defaults to PKR)
  company?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  customerOrVendor: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    sku: string;
    name: string;
    batchNumber?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  paidAmount?: number;
  remainingBalance?: number;
  paymentType: string;
  notes?: string;
}

export function generateInvoicePDF(options: InvoicePDFOptions): void {
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
  doc.text(
    options.type === 'sale' ? 'INVOICE' : 'PURCHASE ORDER',
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 10;

  // Document Number and Date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Document #: ${options.documentNumber}`, margin, yPosition);
  doc.text(`Date: ${new Date(options.date).toLocaleDateString()}`, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 15;

  // Customer/Vendor Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(options.type === 'sale' ? 'Bill To:' : 'From:', margin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(options.customerOrVendor.name, margin, yPosition);
  yPosition += 6;
  
  if (options.customerOrVendor.address) {
    doc.text(options.customerOrVendor.address, margin, yPosition);
    yPosition += 6;
  }
  
  if (options.customerOrVendor.phone) {
    doc.text(`Phone: ${options.customerOrVendor.phone}`, margin, yPosition);
    yPosition += 6;
  }
  
  if (options.customerOrVendor.email) {
    doc.text(`Email: ${options.customerOrVendor.email}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // Items Table
  const tableData = options.items.map((item) => [
    item.sku,
    item.name,
    item.batchNumber || '-',
    item.quantity.toString(),
    formatCurrency(item.unitPrice, currency, { showSymbol: true }),
    formatCurrency(item.totalPrice, currency, { showSymbol: true }),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['SKU', 'Product Name', 'Batch #', 'Qty', 'Unit Price', 'Total']],
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
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;

  // Totals Section
  let totalsY = finalY + 10;
  const totalsX = pageWidth - margin - 80;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, totalsY, { align: 'right' });
  doc.text(formatCurrency(options.subtotal, currency, { showSymbol: true }), pageWidth - margin, totalsY, { align: 'right' });
  totalsY += 8;

  if (options.tax && options.tax > 0) {
    doc.text('Tax:', totalsX, totalsY, { align: 'right' });
    doc.text(formatCurrency(options.tax, currency, { showSymbol: true }), pageWidth - margin, totalsY, { align: 'right' });
    totalsY += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', totalsX, totalsY, { align: 'right' });
  doc.text(formatCurrency(options.total, currency, { showSymbol: true }), pageWidth - margin, totalsY, { align: 'right' });
  totalsY += 10;

  // Payment Information
  if (options.paidAmount !== undefined || options.remainingBalance !== undefined) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (options.paidAmount !== undefined && options.paidAmount > 0) {
      doc.text('Paid:', totalsX, totalsY, { align: 'right' });
      doc.text(formatCurrency(options.paidAmount, currency, { showSymbol: true }), pageWidth - margin, totalsY, { align: 'right' });
      totalsY += 8;
    }
    if (options.remainingBalance !== undefined && options.remainingBalance > 0) {
      doc.text('Balance Due:', totalsX, totalsY, { align: 'right' });
      doc.text(formatCurrency(options.remainingBalance, currency, { showSymbol: true }), pageWidth - margin, totalsY, { align: 'right' });
    }
  }

  totalsY += 10;

  // Payment Type
  doc.text(`Payment Type: ${options.paymentType.charAt(0).toUpperCase() + options.paymentType.slice(1)}`, margin, totalsY);
  totalsY += 8;

  // Notes
  if (options.notes) {
    totalsY += 5;
    doc.setFont('helvetica', 'italic');
    doc.text('Notes:', margin, totalsY);
    totalsY += 6;
    const splitNotes = doc.splitTextToSize(options.notes, pageWidth - 2 * margin);
    doc.text(splitNotes, margin, totalsY);
  }

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
  const fileName = `${options.type === 'sale' ? 'Invoice' : 'Purchase'}_${options.documentNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

