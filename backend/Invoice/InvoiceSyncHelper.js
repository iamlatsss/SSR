import { knexDB } from '../Database.js';

/**
 * Recalculate invoice totals from a list of charge items.
 * Mirrors the calculation logic used in Invoice.jsx and Invoice.js.
 *
 * @param {Array} items - The charge line items
 * @param {string} printType - 'Invoice' (INR) or 'USD'
 * @param {string} clientGstin - Customer GSTIN
 * @param {string} clientState - Customer state code
 * @returns {{ subtotal: number, cgst: number, sgst: number, igst: number, grandTotal: number }}
 */
function recalcTotals(items, printType, clientGstin, clientState) {
  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const isExport = printType === 'USD';
  const isIntraState = !isExport && (
    clientGstin ? String(clientGstin).startsWith('27') : (clientState === '27')
  );

  items.forEach((item) => {
    const qty = parseFloat(item.quantity || item.qty || 1);
    const rate = parseFloat(item.rate || 0);
    const itemCurrency = item.currency || 'USD';
    const rowExRate = parseFloat(item.ex_rate || item.exRate || 85.00);

    let amount = qty * rate;

    if (printType === 'USD') {
      if (itemCurrency === 'INR') {
        amount = amount / rowExRate;
      }
    } else {
      if (itemCurrency === 'USD') {
        amount = amount * rowExRate;
      }
    }

    subtotal += amount;

    const gstRate = parseFloat(item.gst || item.taxPercent || 0);
    const taxAmt = amount * (gstRate / 100);

    if (gstRate > 0) {
      if (isIntraState) {
        cgst += taxAmt / 2;
        sgst += taxAmt / 2;
      } else {
        igst += taxAmt;
      }
    }
  });

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    cgst: parseFloat(cgst.toFixed(2)),
    sgst: parseFloat(sgst.toFixed(2)),
    igst: parseFloat(igst.toFixed(2)),
    grandTotal: parseFloat((subtotal + cgst + sgst + igst).toFixed(2))
  };
}

/**
 * Normalize a string for matching: lowercase + trim.
 */
function norm(val) {
  return String(val || '').toLowerCase().trim();
}

/**
 * Build a matching key for a charge row.
 * Uses charge name + party + currency for identity.
 */
function chargeKey(item) {
  const charge = norm(item.charge || item.chargeName);
  const party = norm(item.party || item.clientId || item.clientName);
  const currency = norm(item.currency);
  return `${charge}||${party}||${currency}`;
}

/**
 * Sync the latest sell_rates from BL additional_details onto linked invoices.
 *
 * Strategy:
 * 1. For each existing invoice item, find a matching sell_rate by charge+party+currency.
 *    If found, update its rate, quantity, GST, SAC, and exchange rate.
 * 2. Any NEW (unlocked) charges from the BL that don't exist in the invoice are appended.
 * 3. Charges that were previously deleted from the invoice are NOT re-added.
 * 4. Totals are recalculated from the updated items.
 *
 * @param {number} jobNo - The job number
 * @param {string} blType - 'MBL' or 'HBL'
 * @param {string} blNo - The MBL or HBL number
 * @param {object} additionalDetails - The parsed additional_details JSON from the BL
 */
export async function syncBLToInvoices(jobNo, blType, blNo, additionalDetails) {
  const sellRates = additionalDetails?.sell_rates || [];

  if (sellRates.length === 0) {
    return; // Nothing to sync
  }

  try {
    // 1. Sync Tax Invoices
    const taxInvoices = await knexDB("Invoices")
      .where({ job_no: jobNo })
      .select('*');

    for (const invoice of taxInvoices) {
      // Skip approved or IRN-posted invoices
      if (invoice.approval_status === 'Approved' || invoice.irn) {
        console.log(`[InvoiceSync] Skipping Tax Invoice #${invoice.invoice_no} (Approved/IRN posted)`);
        continue;
      }

      await syncItemsForInvoice(
        'Invoices',
        invoice,
        sellRates,
        invoice.print_type,
        invoice.client_gstin,
        invoice.client_state
      );

      console.log(`[InvoiceSync] Synced Tax Invoice #${invoice.invoice_no} for job ${jobNo}`);
    }

    // 2. Sync Proforma Invoices
    const proformaInvoices = await knexDB("ProformaInvoices")
      .where({ job_no: jobNo })
      .select('*');

    for (const proforma of proformaInvoices) {
      await syncItemsForInvoice(
        'ProformaInvoices',
        proforma,
        sellRates,
        proforma.print_type,
        proforma.client_gstin,
        proforma.client_state
      );

      console.log(`[InvoiceSync] Synced Proforma Invoice #${proforma.proforma_no || proforma.id} for job ${jobNo}`);
    }

  } catch (err) {
    // Log error but don't break the BL save operation
    console.error(`[InvoiceSync] Error syncing invoices for job ${jobNo}:`, err);
  }
}

/**
 * Internal helper to sync items for a single invoice record.
 *
 * @param {string} tableName - 'Invoices' or 'ProformaInvoices'
 * @param {object} invoice - The invoice DB record
 * @param {Array} sellRates - The latest sell_rates from the BL
 * @param {string} printType - 'Invoice' or 'USD'
 * @param {string} clientGstin - Customer GSTIN
 * @param {string} clientState - Customer state code
 */
async function syncItemsForInvoice(tableName, invoice, sellRates, printType, clientGstin, clientState) {
  // Parse existing invoice items
  let existingItems = [];
  try {
    existingItems = typeof invoice.items === 'string'
      ? JSON.parse(invoice.items)
      : (invoice.items || []);
  } catch (e) {
    console.warn(`[InvoiceSync] Could not parse items for ${tableName} #${invoice.id}`);
    return;
  }

  if (existingItems.length === 0) {
    return; // No items to sync
  }

  // Build a lookup map from sell_rates by charge key
  const sellRateMap = new Map();
  const sellRateUsed = new Set();

  sellRates.forEach((sr, idx) => {
    const key = chargeKey(sr);
    if (!sellRateMap.has(key)) {
      sellRateMap.set(key, []);
    }
    sellRateMap.get(key).push({ ...sr, _idx: idx });
  });

  // Track which sell_rates have been consumed (for multi-match scenarios)
  const consumedSellRateIndices = new Set();

  // Update existing items from sell_rates
  const updatedItems = existingItems.map(item => {
    const key = chargeKey(item);
    const candidates = sellRateMap.get(key) || [];

    // Find the first unconsumed candidate
    const match = candidates.find(c => !consumedSellRateIndices.has(c._idx));

    if (match) {
      consumedSellRateIndices.add(match._idx);

      // Update item fields from the latest sell_rate while preserving identity
      return {
        ...item,
        rate: match.rate !== undefined ? match.rate : item.rate,
        quantity: match.quantity !== undefined ? match.quantity : (match.qty !== undefined ? match.qty : item.quantity),
        gst: match.gst !== undefined ? match.gst : (match.taxPercent !== undefined ? match.taxPercent : item.gst),
        sac: match.sac || match.hsn_sac || item.sac,
        ex_rate: match.ex_rate || match.exRate || item.ex_rate,
        amount: match.amount !== undefined ? match.amount : item.amount,
      };
    }

    // No matching sell_rate found — keep item as-is
    return item;
  });

  // Append NEW unlocked charges from sellRates that aren't already in the invoice
  sellRates.forEach((sr, idx) => {
    if (consumedSellRateIndices.has(idx)) return; // Already matched
    if (sr.locked) return; // Locked charges that weren't matched = already deleted from invoice, skip

    // This is a genuinely new unlocked charge — append it
    updatedItems.push({
      charge: sr.charge || sr.chargeName || '',
      party: sr.party || sr.clientId || sr.clientName || '',
      rate: sr.rate || 0,
      quantity: sr.quantity || sr.qty || 1,
      currency: sr.currency || 'USD',
      gst: sr.gst || sr.taxPercent || 0,
      sac: sr.sac || sr.hsn_sac || '996521',
      ex_rate: sr.ex_rate || sr.exRate || 85.00,
      amount: sr.amount || 0,
      locked: false,
    });
  });

  // Recalculate totals
  const newTotals = recalcTotals(updatedItems, printType, clientGstin, clientState);

  // Write back to DB
  await knexDB(tableName).where({ id: invoice.id }).update({
    items: JSON.stringify(updatedItems),
    totals: JSON.stringify(newTotals)
  });
}
