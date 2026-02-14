/**
 * SHARED Invoice HTML Template
 * This EXACT same code is used for:
 * 1. Backend PDF generation (via Puppeteer)
 * 2. Frontend dashboard display
 * 
 * DO NOT modify this file without updating the backend copy at:
 * venuevue-api/src/services/sharedInvoiceTemplate.js
 */

/**
 * Format currency consistently
 */
export function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(num);
}

/**
 * Format date consistently
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generate the complete invoice HTML
 * This is the SINGLE SOURCE OF TRUTH for invoice rendering
 * 
 * @param {Object} invoice - Invoice data object
 * @returns {string} - Complete HTML string
 */
export function generateInvoiceHTML(invoice) {
  if (!invoice) return '<div>No invoice data</div>';

  const isPaid = invoice.Status === 'paid' || invoice.PaymentStatus === 'paid';
  const booking = invoice.booking || {};

  const subtotal = parseFloat(invoice.Subtotal || invoice.Amount || 0);
  const platformFee = parseFloat(invoice.PlatformFee || 0);
  const taxAmount = parseFloat(invoice.TaxAmount || 0);
  const totalAmount = parseFloat(invoice.TotalAmount || invoice.Amount || 0);

  // Build items HTML
  let itemsHTML = '';
  const items = invoice.items || [];
  if (items.length > 0) {
    itemsHTML = items.map(item => `
      <tr>
        <td style="padding: 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 500; color: #222;">${item.Title || item.ServiceName || 'Service'}</div>
          ${item.Description ? `<div style="font-size: 13px; color: #6b7280; margin-top: 4px;">${item.Description}</div>` : ''}
        </td>
        <td style="padding: 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.Quantity || 1}</td>
        <td style="padding: 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.UnitPrice || item.Amount)}</td>
        <td style="padding: 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.Amount || item.UnitPrice)}</td>
      </tr>
    `).join('');
  } else {
    itemsHTML = `
      <tr>
        <td style="padding: 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 500; color: #222;">${booking.ServiceName || invoice.ServiceName || 'Service'}</div>
        </td>
        <td style="padding: 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: center;">1</td>
        <td style="padding: 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(subtotal)}</td>
        <td style="padding: 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(subtotal)}</td>
      </tr>
    `;
  }

  // Event details section
  let eventDetailsHTML = '';
  if (booking.EventDate || booking.EventName || booking.EventLocation) {
    eventDetailsHTML = `
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
        <div style="font-size: 14px; font-weight: 600; color: #222; margin-bottom: 16px;">Event Details</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          ${booking.EventName ? `
            <div style="display: flex; gap: 8px;">
              <span style="color: #6b7280; font-size: 14px; min-width: 70px;">Event:</span>
              <span style="color: #166534; font-size: 14px; font-weight: 500;">${booking.EventName}</span>
            </div>
          ` : ''}
          ${booking.EventType ? `
            <div style="display: flex; gap: 8px;">
              <span style="color: #6b7280; font-size: 14px; min-width: 70px;">Type:</span>
              <span style="color: #222; font-size: 14px; font-weight: 500;">${booking.EventType}</span>
            </div>
          ` : ''}
          ${booking.EventDate ? `
            <div style="display: flex; gap: 8px;">
              <span style="color: #6b7280; font-size: 14px; min-width: 70px;">Date:</span>
              <span style="color: #222; font-size: 14px; font-weight: 500;">${formatDate(booking.EventDate)}</span>
            </div>
          ` : ''}
          ${booking.EventLocation ? `
            <div style="display: flex; gap: 8px;">
              <span style="color: #6b7280; font-size: 14px; min-width: 70px;">Location:</span>
              <span style="color: #166534; font-size: 14px; font-weight: 500;">${booking.EventLocation}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Payment info section
  let paymentInfoHTML = '';
  if (invoice.PaymentMethod || invoice.TransactionID) {
    paymentInfoHTML = `
      <div style="margin-top: 32px; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <div style="font-size: 14px; font-weight: 600; color: #222; margin-bottom: 12px;">Payment Information</div>
        ${invoice.PaymentMethod ? `<p style="font-size: 14px; color: #6b7280; margin: 4px 0;">Payment Method: ${invoice.PaymentMethod}</p>` : ''}
        ${invoice.TransactionID ? `<p style="font-size: 14px; color: #6b7280; margin: 4px 0;">Transaction ID: ${invoice.TransactionID}</p>` : ''}
      </div>
    `;
  }

  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: #222; font-family: Arial, sans-serif;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; flex-direction: column;">
          <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style="height: 48px; width: auto; margin-bottom: 8px;" />
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Event Booking Platform</p>
        </div>
        <div style="text-align: right;">
          <h2 style="color: #222; font-size: 28px; font-weight: 700; margin: 0;">INVOICE</h2>
          <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
            #${invoice.InvoiceNumber || `INV-${invoice.InvoiceID}`}
          </div>
          <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; background: ${isPaid ? '#dcfce7' : '#fef3c7'}; color: ${isPaid ? '#166534' : '#92400e'};">
            ${isPaid ? 'PAID' : 'PENDING'}
          </div>
        </div>
      </div>

      <!-- Parties -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 32px;">
        <div>
          <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Bill To</div>
          <p style="font-size: 16px; font-weight: 600; color: #222; margin: 0 0 4px 0;">${booking.ClientName || invoice.ClientName || 'Client'}</p>
          <p style="font-size: 14px; color: #6b7280; margin: 4px 0;">${booking.ClientEmail || invoice.ClientEmail || ''}</p>
        </div>
        <div>
          <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Service Provider</div>
          <p style="font-size: 16px; font-weight: 600; color: #222; margin: 0 0 4px 0;">${booking.VendorName || invoice.VendorName || 'Vendor'}</p>
        </div>
        <div>
          <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Invoice Details</div>
          <p style="font-size: 14px; color: #6b7280; margin: 4px 0;"><strong>Issue Date:</strong> ${formatDate(invoice.IssueDate)}</p>
          <p style="font-size: 14px; color: #6b7280; margin: 4px 0;"><strong>Due Date:</strong> ${formatDate(invoice.DueDate || invoice.IssueDate)}</p>
          ${isPaid && invoice.PaidAt ? `<p style="font-size: 14px; color: #6b7280; margin: 4px 0;"><strong>Paid On:</strong> ${formatDate(invoice.PaidAt)}</p>` : ''}
        </div>
      </div>

      <!-- Event Details -->
      ${eventDetailsHTML}

      <!-- Services & Charges -->
      <div style="margin-bottom: 32px;">
        <div style="font-size: 14px; font-weight: 600; color: #222; margin-bottom: 16px;">Services & Charges</div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <tr>
              <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Description</th>
              <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Qty</th>
              <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Unit Price</th>
              <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
          <div style="width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
              <span style="color: #6b7280;">Subtotal</span>
              <span style="color: #222; font-weight: 500;">${formatCurrency(subtotal)}</span>
            </div>
            ${platformFee > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
                <span style="color: #6b7280;">Platform Service Fee</span>
                <span style="color: #222; font-weight: 500;">${formatCurrency(platformFee)}</span>
              </div>
            ` : ''}
            ${taxAmount > 0 ? (() => {
              const taxableAmount = subtotal + platformFee;
              const taxPercent = taxableAmount > 0 ? Math.round((taxAmount / taxableAmount) * 100) : 13;
              const taxLabel = taxPercent === 13 ? 'Tax (HST 13%)' : `Tax (${taxPercent}%)`;
              return `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
                <span style="color: #6b7280;">${taxLabel}</span>
                <span style="color: #222; font-weight: 500;">${formatCurrency(taxAmount)}</span>
              </div>
            `;
            })() : ''}
            <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 16px; font-weight: 600; border-top: 2px solid #e5e7eb; margin-top: 8px;">
              <span>Total</span>
              <span>${formatCurrency(totalAmount)}</span>
            </div>
            ${isPaid ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #166534; font-weight: 600;">
                <span>Amount Paid</span>
                <span>${formatCurrency(totalAmount)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Payment Information -->
      ${paymentInfoHTML}

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 13px;">
        <p>Thank you for using PlanBeau!</p>
        <p>Questions? Contact us at support@planbeau.com</p>
      </div>
    </div>
  `.trim();
}

export default {
  generateInvoiceHTML,
  formatCurrency,
  formatDate
};
