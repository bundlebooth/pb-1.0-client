import React from 'react';
import { generateInvoiceHTML } from '../../utils/sharedInvoiceTemplate';

/**
 * Centralized Invoice Component
 * Uses the SHARED invoice template (sharedInvoiceTemplate.js)
 * This ensures the EXACT SAME rendering for:
 * - Dashboard display (this component)
 * - Email PDF attachments (backend uses same template)
 * - Printed invoices
 * 
 * DO NOT modify invoice styling here - modify sharedInvoiceTemplate.js instead!
 */
const Invoice = ({ invoice }) => {
  if (!invoice) return null;

  const invoiceHTML = generateInvoiceHTML(invoice);

  return (
    <div 
      className="invoice-content"
      dangerouslySetInnerHTML={{ __html: invoiceHTML }}
    />
  );
};

export default Invoice;
