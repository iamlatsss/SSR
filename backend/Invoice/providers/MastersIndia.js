/**
 * GSP Integration Provider for Masters India E-Invoicing
 */
export class MastersIndiaProvider {
  constructor(config = {}) {
    this.clientId = config.clientId || process.env.MASTERS_INDIA_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.MASTERS_INDIA_CLIENT_SECRET;
    this.username = config.username || process.env.MASTERS_INDIA_USERNAME;
    this.password = config.password || process.env.MASTERS_INDIA_PASSWORD;
    this.gstin = config.gstin || process.env.MASTERS_INDIA_GSTIN;
    this.baseUrl = config.baseUrl || process.env.MASTERS_INDIA_BASE_URL || 'https://sandbox.mastersindia.co';
  }

  /**
   * Exchange client credentials and login info for GSP Access Token
   */
  async authenticate() {
    if (!this.clientId || !this.clientSecret || !this.username || !this.password) {
      throw new Error("Masters India credentials are incomplete in environment configuration (.env)");
    }

    const authUrl = `${this.baseUrl}/oauth/access_token`;
    const payload = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: this.username,
      password: this.password,
      grant_type: 'password'
    };

    console.log(`[E-INVOICE] Authenticating with GSP at ${authUrl}...`);
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GSP Authentication failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in
    };
  }

  /**
   * Post GST compliant E-Invoice JSON to GSP portal to generate IRN
   */
  async generateIRN(einvoiceJson) {
    const auth = await this.authenticate();
    const postUrl = `${this.baseUrl}/einvoice/v1.03/dec/generate`;

    console.log(`[E-INVOICE] Posting invoice schema to GSP generate endpoint...`);
    const response = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
        'client_id': this.clientId,
        'client_secret': this.clientSecret,
        'gstin': this.gstin
      },
      body: JSON.stringify(einvoiceJson)
    });

    const rawResponseText = await response.text();
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(rawResponseText);
    } catch (e) {
      throw new Error(`Invalid non-JSON response from GSP (${response.status}): ${rawResponseText}`);
    }

    if (!response.ok || (jsonResponse.success === false) || (jsonResponse.status === 'ERROR')) {
      const errorMsg = jsonResponse.message || jsonResponse.error || rawResponseText;
      throw new Error(`IRN Generation failed: ${errorMsg}`);
    }

    // Success response parsing based on Masters India contract
    // Typically returns: { success: true, data: { Irn, AckNo, AckDt, SignedQrCode, SignedInvoice } }
    const payloadData = jsonResponse.data || jsonResponse;
    if (!payloadData.Irn) {
      throw new Error(`IRN token missing in successful GSP response: ${rawResponseText}`);
    }

    return {
      success: true,
      irn: payloadData.Irn,
      ackNo: payloadData.AckNo || String(payloadData.AckNumber || ''),
      ackDate: payloadData.AckDt || payloadData.AckDate || new Date().toISOString(),
      signedQrCode: payloadData.SignedQrCode || payloadData.QrCodeImage || '',
      signedInvoice: payloadData.SignedInvoice || payloadData.InvoiceSigned || '',
      rawResponse: jsonResponse
    };
  }

  /**
   * Cancel an active IRN
   */
  async cancelIRN(irn, reasonCode, remarks) {
    const auth = await this.authenticate();
    const cancelUrl = `${this.baseUrl}/einvoice/v1.03/dec/cancel`;

    const payload = {
      Irn: irn,
      CnlRsn: String(reasonCode), // '1' = Duplicate, '2' = Data Entry Mistake, '3' = Order Cancelled, '4' = Others
      CnlRem: remarks || 'Cancelled from SSR ERP'
    };

    console.log(`[E-INVOICE] Posting cancel instruction for IRN ${irn}...`);
    const response = await fetch(cancelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
        'client_id': this.clientId,
        'client_secret': this.clientSecret,
        'gstin': this.gstin
      },
      body: JSON.stringify(payload)
    });

    const rawResponseText = await response.text();
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(rawResponseText);
    } catch (e) {
      throw new Error(`Invalid non-JSON cancel response from GSP (${response.status}): ${rawResponseText}`);
    }

    if (!response.ok || (jsonResponse.success === false) || (jsonResponse.status === 'ERROR')) {
      const errorMsg = jsonResponse.message || jsonResponse.error || rawResponseText;
      throw new Error(`IRN Cancellation failed: ${errorMsg}`);
    }

    return {
      success: true,
      irn: irn,
      cancelDate: (jsonResponse.data && jsonResponse.data.CancelDate) || new Date().toISOString(),
      rawResponse: jsonResponse
    };
  }
}
