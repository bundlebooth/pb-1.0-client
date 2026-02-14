/**
 * Invoice PDF Generator
 * Generates pixel-perfect PDF invoices on the frontend using html2canvas + jsPDF
 * Uses the same HTML template as the Invoice component for consistency
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { generateInvoiceHTML } from './sharedInvoiceTemplate';

/**
 * Generate a PDF from the invoice HTML template
 * This creates a pixel-perfect PDF that matches exactly what the user sees
 * 
 * @param {Object} invoiceData - Invoice data (same structure as Invoice component expects)
 * @returns {Promise<Blob>} - PDF as a Blob
 */
export async function generateInvoicePDFBlob(invoiceData) {
  // Create a temporary container for the invoice HTML
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '816px'; // Letter size at 96 DPI (8.5 inches)
  container.style.backgroundColor = 'white';
  
  // Generate the HTML using the shared template
  const html = generateInvoiceHTML(invoiceData);
  container.innerHTML = html;
  
  // Append to body temporarily
  document.body.appendChild(container);
  
  try {
    // Wait for any images/fonts to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture the HTML as a canvas
    const canvas = await html2canvas(container, {
      scale: 2, // Higher resolution for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    // Create PDF (Letter size: 8.5 x 11 inches)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });
    
    // Calculate dimensions to fit the page
    const imgWidth = 8.5;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add the image to the PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, 11));
    
    // If content is longer than one page, add more pages
    if (imgHeight > 11) {
      let remainingHeight = imgHeight - 11;
      let yOffset = -11;
      
      while (remainingHeight > 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
        yOffset -= 11;
        remainingHeight -= 11;
      }
    }
    
    // Return as Blob
    return pdf.output('blob');
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

/**
 * Generate a PDF and return as base64 string (for uploading to backend)
 * 
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise<string>} - Base64 encoded PDF
 */
export async function generateInvoicePDFBase64(invoiceData) {
  const blob = await generateInvoicePDFBlob(invoiceData);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Remove the data URL prefix to get just the base64
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download the invoice PDF directly
 * 
 * @param {Object} invoiceData - Invoice data
 * @param {string} filename - Optional filename (defaults to Invoice-{number}.pdf)
 */
export async function downloadInvoicePDF(invoiceData, filename = null) {
  const blob = await generateInvoicePDFBlob(invoiceData);
  const invoiceNumber = invoiceData.InvoiceNumber || `INV-${invoiceData.InvoiceID || Date.now()}`;
  const finalFilename = filename || `Invoice-${invoiceNumber}.pdf`;
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Upload the generated PDF to the backend for a specific booking
 * This allows the backend to attach the exact same PDF to emails
 * 
 * @param {Object} invoiceData - Invoice data
 * @param {number} bookingId - The booking ID
 * @param {Function} apiPost - The API post function from useApi hook
 * @returns {Promise<Object>} - Response from the backend
 */
export async function uploadInvoicePDF(invoiceData, bookingId, apiPost) {
  try {
    const base64PDF = await generateInvoicePDFBase64(invoiceData);
    const invoiceNumber = invoiceData.InvoiceNumber || `INV-${invoiceData.InvoiceID || bookingId}`;
    
    const response = await apiPost('/invoices/upload-pdf', {
      bookingId,
      invoiceNumber,
      pdfBase64: base64PDF
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload invoice PDF');
    }
    
    return await response.json();
  } catch (error) {
    console.error('[InvoicePDF] Failed to upload PDF:', error);
    throw error;
  }
}
