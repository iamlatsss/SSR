import { knexDB } from '../Database.js';
import { MastersIndiaProvider } from './providers/MastersIndia.js';
import { MockEInvoiceProvider } from './providers/MockProvider.js';

// Resolve configured provider from environment
function getEInvoiceProvider() {
  const providerType = (process.env.E_INVOICE_PROVIDER || 'Mock').toLowerCase();
  const branchGstin = process.env.BRANCH_GSTIN || '27AAFCS0000A1Z1';

  if (providerType === 'mastersindia') {
    return new MastersIndiaProvider({
      clientId: process.env.MASTERS_INDIA_CLIENT_ID,
      clientSecret: process.env.MASTERS_INDIA_CLIENT_SECRET,
      username: process.env.MASTERS_INDIA_USERNAME,
      password: process.env.MASTERS_INDIA_PASSWORD,
      gstin: branchGstin,
      baseUrl: process.env.MASTERS_INDIA_BASE_URL
    });
  }

  // Fallback to Mock Provider for testing/sandbox
  return new MockEInvoiceProvider({ gstin: branchGstin });
}

/**
 * Audit log helper
 */
export async function logEInvoiceAction(invoiceId, invoiceNo, action, user, details) {
  try {
    await knexDB("EInvoiceAuditLogs").insert({
      invoice_id: invoiceId,
      invoice_no: invoiceNo,
      action: action,
      user_id: user?.user_id || null,
      user_name: user?.user_name || 'System',
      user_email: user?.email || 'system@ssrlogistic.net',
      details: typeof details === 'object' ? JSON.stringify(details) : String(details)
    });
  } catch (err) {
    console.error("Failed to write e-invoice audit log:", err);
  }
}

/**
 * Validate customer GSTIN format
 */
function isValidGstin(gstin) {
  if (!gstin) return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.trim().toUpperCase());
}

/**
 * Validate Port Code (exactly 6 characters alphanumeric)
 */
function isValidPortCode(portCode) {
  if (!portCode) return false;
  return /^[A-Z]{2}[A-Z0-9]{4}$/i.test(portCode.trim());
}

/**
 * Perform all business logic validations for an invoice
 */
export async function validateInvoiceDetails(invoice) {
  const errors = [];

  // 1. Check basic Invoice Details
  if (!invoice.invoice_no) errors.push("Invoice number is missing.");
  if (!invoice.invoice_date) errors.push("Invoice date is missing.");

  // 2. Resolve Job details for extra validation
  let jobRecord = null;
  if (invoice.job_no) {
    if (invoice.mbl_hbl_type === 'MBL') {
      jobRecord = await knexDB("MasterBL").where({ job_no: invoice.job_no }).first();
    } else {
      jobRecord = await knexDB("HouseBL").where({ job_no: invoice.job_no }).first();
    }
  }

  // 3. Customer validations
  const clientGstin = (invoice.client_gstin || '').trim();
  const clientState = (invoice.client_state || '').trim();
  const clientAddress = (invoice.client_address || '').trim();

  if (!invoice.client_name) {
    errors.push("Client Name is missing.");
  }

  if (!clientAddress) {
    errors.push("Client Address is missing.");
  }

  // GSTIN formats validation
  const isExport = invoice.print_type === 'USD';
  if (!isExport) {
    if (!clientGstin) {
      errors.push("GSTIN is required for domestic tax invoices.");
    } else if (!isValidGstin(clientGstin)) {
      errors.push(`Customer GSTIN '${clientGstin}' format is invalid. Must be standard 15-char format.`);
    }

    if (clientGstin && clientState) {
      const gstinStatePrefix = clientGstin.substring(0, 2);
      if (gstinStatePrefix !== clientState) {
        errors.push(`Place of Supply/State code mismatch: GSTIN prefix '${gstinStatePrefix}' does not match state code '${clientState}'.`);
      }
    }
  }

  // Branch / Seller GSTIN validation
  const branchGstin = process.env.BRANCH_GSTIN || '27AAFCS0000A1Z1'; // default SSR
  if (!isValidGstin(branchGstin)) {
    errors.push(`Branch GSTIN '${branchGstin}' is invalid.`);
  }

  // 4. Line Items validations
  let items = [];
  try {
    items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
  } catch (e) {
    errors.push("Invoice items are corrupted or invalid JSON format.");
  }

  if (items.length === 0) {
    errors.push("Invoice must contain at least one billing charge row.");
  }

  let calculatedTax = 0;
  let subtotalVal = 0;

  items.forEach((item, index) => {
    const rowNo = index + 1;
    if (!item.charge) errors.push(`Row #${rowNo}: Charge name is missing.`);
    
    // SAC / HSN Code validation
    const sac = (item.sac || item.hsn_sac || '').trim();
    if (!sac) {
      errors.push(`Row #${rowNo}: SAC/HSN code is missing.`);
    } else if (!/^[0-9]{4,8}$/.test(sac)) {
      errors.push(`Row #${rowNo}: SAC/HSN code '${sac}' is invalid. Must be 4 to 8 digits.`);
    }

    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const exRate = parseFloat(item.ex_rate) || 1;
    const currency = item.currency || 'INR';

    let itemTotal = qty * rate;
    if (currency === 'USD' && !isExport) {
      itemTotal = itemTotal * exRate;
    }

    subtotalVal += itemTotal;
    const gstRate = parseFloat(item.gst || 0);
    calculatedTax += itemTotal * (gstRate / 100);
  });

  // Totals validation
  let totals = {};
  try {
    totals = typeof invoice.totals === 'string' ? JSON.parse(invoice.totals) : (invoice.totals || {});
  } catch (e) {}

  const grandTotal = parseFloat(totals.grandTotal || totals.inrTotal || 0);
  if (grandTotal <= 0) {
    errors.push("Grand total amount must be greater than zero.");
  }

  // 5. Export validations
  if (isExport) {
    let addDetails = {};
    if (jobRecord && jobRecord.additional_details) {
      try {
        addDetails = typeof jobRecord.additional_details === 'string'
          ? JSON.parse(jobRecord.additional_details)
          : jobRecord.additional_details;
      } catch (e) {}
    }

    const pol = (jobRecord?.pol || addDetails.pol || '').trim();
    const portCode = (addDetails.port_code || 'INBOM6').trim(); // Default port code if missing for testing
    const country = (addDetails.country || 'Overseas').trim();
    const currency = (invoice.print_type || 'USD').trim();
    const exRate = parseFloat(invoice.exRate || totals.exRate || 85.00);

    if (!isValidPortCode(portCode)) {
      errors.push(`Export Port Code '${portCode}' is invalid. Must be exactly 6 characters alphanumeric (e.g. INBOM6).`);
    }

    if (!country) {
      errors.push("Export destination country is required.");
    }

    if (exRate <= 0) {
      errors.push("Export exchange rate must be greater than zero.");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Construct GST Compliant E-Invoice JSON payload
 */
export function buildEInvoiceJSON(invoice, jobDetails = {}) {
  const branchGstin = process.env.BRANCH_GSTIN || '27AAFCS0000A1Z1';
  
  // Basic address parsing
  const clientAddress = invoice.client_address || '';
  const addrParts = clientAddress.split(',').map(p => p.trim()).filter(Boolean);
  const addr1 = addrParts[0] || 'Client Address Line 1';
  const addr2 = addrParts.slice(1).join(', ').substring(0, 100) || 'Client Address Line 2';

  let items = [];
  try {
    items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
  } catch (e) {}

  let totals = {};
  try {
    totals = typeof invoice.totals === 'string' ? JSON.parse(invoice.totals) : (invoice.totals || {});
  } catch (e) {}

  const isExport = invoice.print_type === 'USD';
  const stateInfo = invoice.client_state || '27';

  // Construct item list
  const itemList = items.map((item, index) => {
    const qty = parseFloat(item.quantity) || 1;
    const rate = parseFloat(item.rate) || 0;
    const exRate = parseFloat(item.ex_rate || invoice.exRate || 85.00);
    const isItemUSD = item.currency === 'USD';
    const taxableAmt = isItemUSD ? qty * rate * exRate : qty * rate;

    const gstRate = parseFloat(item.gst || 0);
    const taxAmt = taxableAmt * (gstRate / 100);

    const isIntra = stateInfo === branchGstin.substring(0, 2);

    return {
      SlNo: String(index + 1),
      PrdDesc: item.charge || 'Logistics Service Charges',
      IsServc: 'Y',
      HsnCd: item.sac || item.hsn_sac || '996521',
      Qty: qty,
      FreeQty: 0,
      Unit: 'OTH',
      UnitPrice: Number(taxableAmt.toFixed(2)),
      TotAmt: Number(taxableAmt.toFixed(2)),
      Discount: 0,
      PreTaxVal: Number(taxableAmt.toFixed(2)),
      AssVal: Number(taxableAmt.toFixed(2)),
      GstRt: gstRate,
      CgstAmt: isIntra ? Number((taxAmt / 2).toFixed(2)) : 0,
      SgstAmt: isIntra ? Number((taxAmt / 2).toFixed(2)) : 0,
      IgstAmt: !isIntra ? Number(taxAmt.toFixed(2)) : 0,
      CesRt: 0,
      CesAmt: 0,
      CesNonAdValAmt: 0,
      StateCesRt: 0,
      StateCesAmt: 0,
      TotItemVal: Number((taxableAmt + taxAmt).toFixed(2))
    };
  });

  // Calculate global values
  let totAssVal = 0;
  let totCgstAmt = 0;
  let totSgstAmt = 0;
  let totIgstAmt = 0;

  itemList.forEach(item => {
    totAssVal += item.AssVal;
    totCgstAmt += item.CgstAmt;
    totSgstAmt += item.SgstAmt;
    totIgstAmt += item.IgstAmt;
  });

  const totVal = totAssVal + totCgstAmt + totSgstAmt + totIgstAmt;
  const roundOff = Math.round(totVal) - totVal;
  const totInvVal = Math.round(totVal);

  const payload = {
    Version: "1.03",
    TranDtls: {
      TaxSch: "GST",
      RegRev: "N",
      EcmGstin: null,
      IgstOnIntra: "N"
    },
    DocDtls: {
      Typ: "INV",
      No: invoice.invoice_no,
      Dt: new Date(invoice.invoice_date).toLocaleDateString('en-GB').replace(/\//g, '-') // DD-MM-YYYY
    },
    SellerDtls: {
      Gstin: branchGstin,
      LglNm: "SSR LOGISTIC SOLUTIONS PRIVATE LIMITED",
      TrdNm: "SSR LOGISTIC SOLUTIONS PVT LTD",
      Addr1: "6, AIR VIEW APARTMENTS, NEHRU ROAD",
      Addr2: "VAKOLA B, SANTACRUZ (EAST)",
      Loc: "MUMBAI",
      Pin: 400055,
      Stcd: branchGstin.substring(0, 2),
      Em: "accounts@ssrlogistic.net",
      Ph: "7700990630"
    },
    BuyerDtls: {
      Gstin: isExport ? 'URP' : (invoice.client_gstin || 'URP'),
      LglNm: invoice.client_name,
      TrdNm: invoice.client_name,
      Pos: isExport ? '96' : stateInfo, // '96' is code for foreign country in POS
      Addr1: addr1,
      Addr2: addr2,
      Loc: invoice.client_city || 'MUMBAI',
      Pin: isExport ? 999999 : (parseInt(invoice.client_pincode) || 400001),
      Stcd: isExport ? '96' : stateInfo,
      Em: invoice.client_email || 'client@ssrlogistic.net',
      Ph: invoice.client_phone || '0000000000'
    },
    ItemList: itemList,
    ValDtls: {
      TotAssVal: Number(totAssVal.toFixed(2)),
      CgstVal: Number(totCgstAmt.toFixed(2)),
      SgstVal: Number(totSgstAmt.toFixed(2)),
      IgstVal: Number(totIgstAmt.toFixed(2)),
      CesVal: 0,
      StCesVal: 0,
      Discount: 0,
      OtherChrg: 0,
      RoundOff: Number(roundOff.toFixed(2)),
      TotInvVal: Number(totInvVal.toFixed(2))
    }
  };

  if (isExport) {
    payload.ExpDtls = {
      ShipBNo: jobDetails.shipping_bill_no || '000000',
      ShipBDt: jobDetails.shipping_bill_date ? new Date(jobDetails.shipping_bill_date).toLocaleDateString('en-GB').replace(/\//g, '-') : null,
      Port: jobDetails.port_code || 'INBOM6',
      RefCl: 'N',
      ForCur: 'USD',
      CntCode: jobDetails.country_code || 'US'
    };
  }

  return payload;
}

/**
 * CORE SERVICE ACTIONS
 */

export async function approveInvoice(invoiceId, user) {
  const invoice = await knexDB("Invoices").where({ id: invoiceId }).first();
  if (!invoice) throw new Error("Invoice not found.");

  if (invoice.approval_status === 'Approved') {
    throw new Error("Invoice is already approved.");
  }

  // Perform validation
  const validation = await validateInvoiceDetails(invoice);
  if (!validation.valid) {
    throw new Error("Validation failed:\n" + validation.errors.join("\n"));
  }

  // Update status in db
  await knexDB("Invoices").where({ id: invoiceId }).update({
    approval_status: 'Approved',
    einvoice_status: 'Ready For Posting',
    rejection_reason: null,
    rejection_remarks: null
  });

  await logEInvoiceAction(invoiceId, invoice.invoice_no, 'Approval', user, "Invoice validated and approved successfully.");
  return { success: true, message: "Invoice approved and locked successfully." };
}

export async function rejectInvoice(invoiceId, reason, remarks, user) {
  if (!reason) throw new Error("Rejection reason is required.");

  const invoice = await knexDB("Invoices").where({ id: invoiceId }).first();
  if (!invoice) throw new Error("Invoice not found.");

  if (invoice.approval_status === 'Approved' && invoice.irn) {
    throw new Error("Cannot reject an invoice that already has a posted IRN.");
  }

  // Update status in db
  await knexDB("Invoices").where({ id: invoiceId }).update({
    approval_status: 'Rejected',
    einvoice_status: 'Failed',
    rejection_reason: reason,
    rejection_remarks: remarks || ''
  });

  await logEInvoiceAction(invoiceId, invoice.invoice_no, 'Rejection', user, {
    reason,
    remarks: remarks || ''
  });

  return { success: true, message: "Invoice rejected successfully." };
}

export async function postInvoiceToPortal(invoiceId, user) {
  const invoice = await knexDB("Invoices").where({ id: invoiceId }).first();
  if (!invoice) throw new Error("Invoice not found.");

  if (invoice.approval_status !== 'Approved') {
    throw new Error("Invoice must be approved before posting to portal.");
  }

  if (invoice.irn) {
    throw new Error("Invoice already posted and has active IRN.");
  }

  // Retrieve Job details
  let jobRecord = null;
  if (invoice.job_no) {
    if (invoice.mbl_hbl_type === 'MBL') {
      jobRecord = await knexDB("MasterBL").where({ job_no: invoice.job_no }).first();
    } else {
      jobRecord = await knexDB("HouseBL").where({ job_no: invoice.job_no }).first();
    }
  }

  let addDetails = {};
  if (jobRecord && jobRecord.additional_details) {
    try {
      addDetails = typeof jobRecord.additional_details === 'string'
        ? JSON.parse(jobRecord.additional_details)
        : jobRecord.additional_details;
    } catch (e) {}
  }

  // Construct payload
  const eInvoiceJson = buildEInvoiceJSON(invoice, {
    shipping_bill_no: addDetails.shipping_bill_no || '000000',
    shipping_bill_date: addDetails.shipping_bill_date || null,
    port_code: addDetails.port_code || 'INBOM6',
    country_code: addDetails.country_code || 'US'
  });

  const provider = getEInvoiceProvider();
  
  try {
    // Send to GSP Provider
    const result = await provider.generateIRN(eInvoiceJson);

    // Save tokens in DB
    await knexDB("Invoices").where({ id: invoiceId }).update({
      irn: result.irn,
      ack_no: result.ackNo,
      ack_date: result.ackDate,
      signed_qr_code: result.signedQrCode,
      signed_invoice: result.signedInvoice,
      einvoice_status: 'Posted',
      einvoice_response: JSON.stringify(result.rawResponse)
    });

    // Write audit logs
    await logEInvoiceAction(invoiceId, invoice.invoice_no, 'IRN Generation', user, {
      irn: result.irn,
      ackNo: result.ackNo,
      ackDate: result.ackDate
    });

    return {
      success: true,
      message: "E-Invoice posted successfully!",
      irn: result.irn,
      ackNo: result.ackNo,
      ackDate: result.ackDate
    };

  } catch (gspErr) {
    console.error("GSP Generation API error:", gspErr.message);

    // Update status in DB to Failed
    await knexDB("Invoices").where({ id: invoiceId }).update({
      einvoice_status: 'Failed',
      einvoice_response: JSON.stringify({ error: gspErr.message })
    });

    await logEInvoiceAction(invoiceId, invoice.invoice_no, 'Posting', user, {
      error: gspErr.message,
      status: 'Failed'
    });

    throw new Error(`GSP Provider Error: ${gspErr.message}`);
  }
}

export async function cancelInvoiceIRN(invoiceId, reasonCode, remarks, user) {
  const invoice = await knexDB("Invoices").where({ id: invoiceId }).first();
  if (!invoice) throw new Error("Invoice not found.");

  if (!invoice.irn) {
    throw new Error("No active IRN found for this invoice. Cannot cancel.");
  }

  if (invoice.einvoice_status === 'Cancelled') {
    throw new Error("E-Invoice is already cancelled.");
  }

  const provider = getEInvoiceProvider();

  try {
    const result = await provider.cancelIRN(invoice.irn, reasonCode, remarks);

    // Update status in DB
    await knexDB("Invoices").where({ id: invoiceId }).update({
      einvoice_status: 'Cancelled',
      approval_status: 'Pending', // Revert approval status so they can fix and re-post if needed
      einvoice_response: JSON.stringify(result.rawResponse)
    });

    await logEInvoiceAction(invoiceId, invoice.invoice_no, 'Cancellation', user, {
      irn: invoice.irn,
      reasonCode,
      remarks
    });

    return {
      success: true,
      message: "IRN cancelled successfully on Government portal.",
      cancelledAt: result.cancelDate
    };

  } catch (cancelErr) {
    console.error("GSP Cancel IRN API error:", cancelErr.message);

    await logEInvoiceAction(invoiceId, invoice.invoice_no, 'Cancellation', user, {
      irn: invoice.irn,
      error: cancelErr.message,
      status: 'Cancellation Failed'
    });

    throw new Error(`Cancellation failed: ${cancelErr.message}`);
  }
}
