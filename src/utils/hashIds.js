/**
 * HashID Utility Module for Frontend
 * 
 * Provides obfuscated public IDs for all database entities.
 * Uses the same salts as the backend to ensure consistent encoding/decoding.
 * 
 * IMPORTANT: The salt must match the backend salt exactly!
 * Set REACT_APP_HASHID_SALT in your environment variables.
 * 
 * Usage:
 *   import { encodeVendorId, decodeVendorId } from './utils/hashIds';
 *   const publicId = encodeVendorId(28);  // Returns something like "XzA91Qb3"
 *   const internalId = decodeVendorId("XzA91Qb3");  // Returns 28
 */

import Hashids from 'hashids';
import { HASHID_SALT, HASHID_MIN_LENGTH } from '../config';

// Configuration - loaded from environment via config.js
// IMPORTANT: Set REACT_APP_HASHID_SALT in environment variables for production
const BASE_SALT = HASHID_SALT;
const MIN_LENGTH = HASHID_MIN_LENGTH;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Create separate Hashids instances for each entity type
const hashids = {
  vendor: new Hashids(`${BASE_SALT}_vendor`, MIN_LENGTH, ALPHABET),
  user: new Hashids(`${BASE_SALT}_user`, MIN_LENGTH, ALPHABET),
  booking: new Hashids(`${BASE_SALT}_booking`, MIN_LENGTH, ALPHABET),
  invoice: new Hashids(`${BASE_SALT}_invoice`, MIN_LENGTH, ALPHABET),
  service: new Hashids(`${BASE_SALT}_service`, MIN_LENGTH, ALPHABET),
  category: new Hashids(`${BASE_SALT}_category`, MIN_LENGTH, ALPHABET),
  conversation: new Hashids(`${BASE_SALT}_conversation`, MIN_LENGTH, ALPHABET),
  message: new Hashids(`${BASE_SALT}_message`, MIN_LENGTH, ALPHABET),
  notification: new Hashids(`${BASE_SALT}_notification`, MIN_LENGTH, ALPHABET),
  review: new Hashids(`${BASE_SALT}_review`, MIN_LENGTH, ALPHABET),
  transaction: new Hashids(`${BASE_SALT}_transaction`, MIN_LENGTH, ALPHABET),
  package: new Hashids(`${BASE_SALT}_package`, MIN_LENGTH, ALPHABET),
  announcement: new Hashids(`${BASE_SALT}_announcement`, MIN_LENGTH, ALPHABET),
  faq: new Hashids(`${BASE_SALT}_faq`, MIN_LENGTH, ALPHABET),
  image: new Hashids(`${BASE_SALT}_image`, MIN_LENGTH, ALPHABET),
};

// ============================================
// ENCODING FUNCTIONS (Internal ID -> Public ID)
// ============================================

export function encodeVendorId(id) {
  if (!id || isNaN(parseInt(id))) return null;
  return hashids.vendor.encode(parseInt(id));
}

export function encodeUserId(id) {
  if (!id || isNaN(parseInt(id))) return null;
  return hashids.user.encode(parseInt(id));
}

export function encodeBookingId(id) {
  if (!id || isNaN(parseInt(id))) return null;
  return hashids.booking.encode(parseInt(id));
}

export function encodeInvoiceId(id) {
  if (!id || isNaN(parseInt(id))) return null;
  return hashids.invoice.encode(parseInt(id));
}

export function encodeServiceId(id) {
  if (!id || isNaN(parseInt(id))) return null;
  return hashids.service.encode(parseInt(id));
}

export function encodeCategoryId(id) {
  if (!id || isNaN(parseInt(id))) return null;
  return hashids.category.encode(parseInt(id));
}

export function encodeConversationId(id) {
  if (!id || isNaN(parseInt(id))) return null;
  return hashids.conversation.encode(parseInt(id));
}

export function encodeMessageId(id) {
  if (!id || isNaN(parseInt(id))) return null;
  return hashids.message.encode(parseInt(id));
}

export function encodePackageId(id) {
  if (!id || isNaN(parseInt(id))) return null;
  return hashids.package.encode(parseInt(id));
}

export function encodeImageId(id) {
  if (!id || isNaN(parseInt(id))) return null;
  return hashids.image.encode(parseInt(id));
}

// ============================================
// DECODING FUNCTIONS (Public ID -> Internal ID)
// ============================================

// Strict decode helper - verifies the ID re-encodes to the same value (prevents tampering)
function strictDecode(hashidInstance, publicId) {
  if (!publicId) return null;
  const decoded = hashidInstance.decode(publicId);
  if (decoded.length === 0) return null;
  // Re-encode and verify it matches exactly (prevents padded/tampered IDs)
  const reEncoded = hashidInstance.encode(decoded[0]);
  if (reEncoded !== publicId) return null;
  return decoded[0];
}

export function decodeVendorId(publicId) {
  return strictDecode(hashids.vendor, publicId);
}

export function decodeUserId(publicId) {
  return strictDecode(hashids.user, publicId);
}

export function decodeBookingId(publicId) {
  return strictDecode(hashids.booking, publicId);
}

export function decodeInvoiceId(publicId) {
  return strictDecode(hashids.invoice, publicId);
}

export function decodeServiceId(publicId) {
  return strictDecode(hashids.service, publicId);
}

export function decodeCategoryId(publicId) {
  return strictDecode(hashids.category, publicId);
}

export function decodeConversationId(publicId) {
  return strictDecode(hashids.conversation, publicId);
}

export function decodeMessageId(publicId) {
  return strictDecode(hashids.message, publicId);
}

export function decodePackageId(publicId) {
  return strictDecode(hashids.package, publicId);
}

export function decodeImageId(publicId) {
  return strictDecode(hashids.image, publicId);
}

// ============================================
// GENERIC ENCODE/DECODE BY TYPE
// ============================================

export function encodeId(type, id) {
  if (!hashids[type]) {
    console.warn(`Unknown entity type for encoding: ${type}`);
    return null;
  }
  if (!id || isNaN(parseInt(id))) return null;
  return hashids[type].encode(parseInt(id));
}

export function decodeId(type, publicId) {
  if (!hashids[type]) {
    console.warn(`Unknown entity type for decoding: ${type}`);
    return null;
  }
  return strictDecode(hashids[type], publicId);
}

// ============================================
// HELPER: Check if a string looks like a public ID vs numeric ID
// ============================================

export function isPublicId(idString) {
  if (!idString) return false;
  // If it's purely numeric, it's likely an internal ID
  if (/^\d+$/.test(idString)) return false;
  // If it contains only valid hashid characters and is at least MIN_LENGTH, it's likely a public ID
  return /^[a-zA-Z0-9]+$/.test(idString) && idString.length >= MIN_LENGTH;
}

// ============================================
// HELPER: Extract public ID from slug (e.g., "business-name-XzA91Qb3" -> "XzA91Qb3")
// ============================================

export function extractPublicIdFromSlug(slug) {
  if (!slug) return null;
  // Try to extract the last segment after the last hyphen
  const parts = slug.split('-');
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    // Check if it looks like a public ID (not purely numeric)
    if (isPublicId(lastPart)) {
      return lastPart;
    }
  }
  // If the entire slug is a public ID
  if (isPublicId(slug)) {
    return slug;
  }
  return null;
}

// ============================================
// HELPER: Extract vendor ID from slug (handles both old numeric and new public ID format)
// ============================================

export function extractVendorIdFromSlug(slugWithId) {
  if (!slugWithId) return null;
  
  // First, try to extract public ID from slug
  const publicId = extractPublicIdFromSlug(slugWithId);
  if (publicId) {
    const internalId = decodeVendorId(publicId);
    if (internalId !== null) {
      return internalId;
    }
  }
  
  // Fallback: Try old numeric format (e.g., "business-name-28")
  const numericMatch = slugWithId.match(/-(\d+)$/);
  if (numericMatch) {
    return parseInt(numericMatch[1], 10);
  }
  
  // If the entire slug is just a number
  if (/^\d+$/.test(slugWithId)) {
    return parseInt(slugWithId, 10);
  }
  
  // Try decoding the entire slug as a public ID
  const decoded = decodeVendorId(slugWithId);
  if (decoded !== null) {
    return decoded;
  }
  
  return null;
}

// ============================================
// HELPER: Get public ID from vendor object (handles both old and new format)
// ============================================

export function getVendorPublicId(vendor) {
  if (!vendor) return null;
  
  // If vendor already has a publicId field, use it
  if (vendor.publicId) {
    return vendor.publicId;
  }
  
  // Otherwise, encode the VendorProfileID
  const vendorId = vendor.VendorProfileID || vendor.vendorProfileId || vendor.id;
  if (vendorId) {
    return encodeVendorId(vendorId);
  }
  
  return null;
}

export function getBookingPublicId(booking) {
  if (!booking) return null;
  
  if (booking.publicId) {
    return booking.publicId;
  }
  
  const bookingId = booking.BookingID || booking.bookingId || booking.id;
  if (bookingId) {
    return encodeBookingId(bookingId);
  }
  
  return null;
}

export function getInvoicePublicId(invoice) {
  if (!invoice) return null;
  
  if (invoice.publicId) {
    return invoice.publicId;
  }
  
  const invoiceId = invoice.InvoiceID || invoice.invoiceId || invoice.id;
  if (invoiceId) {
    return encodeInvoiceId(invoiceId);
  }
  
  return null;
}

export function getUserPublicId(user) {
  if (!user) return null;
  
  if (user.publicId) {
    return user.publicId;
  }
  
  const userId = user.UserID || user.userId || user.id;
  if (userId) {
    return encodeUserId(userId);
  }
  
  return null;
}

export function getServicePublicId(service) {
  if (!service) return null;
  
  if (service.publicId) {
    return service.publicId;
  }
  
  const serviceId = service.ServiceID || service.serviceId || service.id;
  if (serviceId) {
    return encodeServiceId(serviceId);
  }
  
  return null;
}
