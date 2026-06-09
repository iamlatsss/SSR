import crypto from 'crypto';

/**
 * Mock E-Invoice Provider for Offline/Sandbox Testing
 */
export class MockEInvoiceProvider {
  constructor(config = {}) {
    this.gstin = config.gstin || '27AAFCS0000A1Z1';
  }

  async authenticate() {
    console.log("[E-INVOICE MOCK] Authenticating credentials...");
    return {
      accessToken: "mock_jwt_access_token_" + crypto.randomBytes(16).toString('hex'),
      expiresIn: 3600
    };
  }

  async generateIRN(einvoiceJson) {
    console.log("[E-INVOICE MOCK] Generating IRN for payload:", JSON.stringify(einvoiceJson, null, 2));
    
    // Generate a standard 64-character hex IRN string
    const mockIrn = crypto.createHash('sha256')
      .update(einvoiceJson.DocDtls?.No + '-' + Date.now())
      .digest('hex');

    const ackNo = String(Math.floor(100000000000 + Math.random() * 900000000000));
    const ackDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Mock Base64 QR code image token
    const mockQrBase64 = "MOCK_QR_CODE_DATA_FOR_INVOICE_" + einvoiceJson.DocDtls?.No + "_" + mockIrn.substring(0, 16);

    const mockSignedInv = "MOCK_SIGNED_JWT_INVOICE_PAYLOAD_FROM_GOVERNMENT_PORTAL_" + crypto.randomBytes(32).toString('base64');

    return {
      success: true,
      irn: mockIrn,
      ackNo: ackNo,
      ackDate: ackDate,
      signedQrCode: mockQrBase64,
      signedInvoice: mockSignedInv,
      rawResponse: {
        success: true,
        status: "SUCCESS",
        message: "E-Invoice generated successfully via Mock Sandbox Provider",
        data: {
          Irn: mockIrn,
          AckNo: ackNo,
          AckDt: ackDate,
          SignedQrCode: mockQrBase64,
          SignedInvoice: mockSignedInv
        }
      }
    };
  }

  async cancelIRN(irn, reasonCode, remarks) {
    console.log(`[E-INVOICE MOCK] Cancelling IRN ${irn} (Reason Code: ${reasonCode}, Remarks: ${remarks})...`);
    return {
      success: true,
      irn: irn,
      cancelDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      rawResponse: {
        success: true,
        status: "SUCCESS",
        message: "IRN cancelled successfully via Mock Sandbox Provider",
        data: {
          Irn: irn,
          CancelDate: new Date().toISOString()
        }
      }
    };
  }
}
