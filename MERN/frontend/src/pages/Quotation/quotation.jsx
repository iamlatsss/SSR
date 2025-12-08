import React, { useState, useMemo } from "react";
import Navbar from "../NavBar/navbar";

const QuotationForm = () => {
  const [formData, setFormData] = useState({
    email: "",
    pol: "",
    pod: "",
    containerSize: "",
    rate: "",
    Ocean_freight: "",
    Shipping_line_charges: "",
    DO_charges: "",
    shipperDetails: "",
    consigneeDetails: "",
    terms: "",
    validity: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString();
    } catch {
      return isoDate;
    }
  };

  // Build plain-text email body for mailto:
  const buildMailtoBody = () => {
    const lines = [
      "Dear Sir,",
      "",
      "Thank you for your inquiry. We are pleased to provide our best offer for your kind reference:",
      "",
      `POL: ${formData.pol || ""}`,
      `POD: ${formData.pod || ""}`,
      `Container Size: ${formData.containerSize || ""}`,
      `Rate: ${formData.rate || ""}`,
      `Ocean Freight: ${formData.Ocean_freight || ""}`,
      `Shipping Line Charges: ${formData.Shipping_line_charges || ""}`,
      `DO Charges: ${formData.DO_charges || ""}`,
      "",
      "Shipper Details:",
      formData.shipperDetails || "",
      "",
      "Consignee Details:",
      formData.consigneeDetails || "",
      "",
      "Terms & Conditions:",
      formData.terms || "",
      "",
      `Validity: ${formatDate(formData.validity) || ""}`,
      "",
      "We trust that the above offer is competitive and meets your requirements.",
      "We look forward to your kind confirmation for further bookings.",
      "",
      "Sincerely,",
      "SSR Logistic Solutions",
    ];

    return lines.join("\n");
  };

  // Open default mail client (must be Outlook in system settings)
  const openMailClient = () => {
    const to = formData.email || "";
    const subject = "Quotation from SSR Logistic Solutions";
    const body = buildMailtoBody();

    const mailto =
      "mailto:" +
      encodeURIComponent(to) +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);

    window.location.href = mailto;
  };

  // LIVE EMAIL HTML TEMPLATE (for on-page preview + clipboard)
  const emailHtml = useMemo(() => {
    const raw = `
<!DOCTYPE html>
<html>
<head>
<style>
body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333333;
  background-color: #f4f4f4;
  margin: 0;
  padding: 0;
}
.container {
  max-width: 600px;
  margin: 20px auto;
  background-color: #ffffff;
  padding: 30px;
  border: 1px solid #dddddd;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.header {
  text-align: center;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
  margin-bottom: 20px;
}
.header h1 {
  color: #007bff;
  margin: 0;
  font-size: 24px;
}
.content {
  margin-bottom: 20px;
}
.quotation-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}
.quotation-table th, .quotation-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #dddddd;
}
.quotation-table tr:nth-child(even) {
  background-color: #f9f9f9;
}
.signature {
  margin-top: 20px;
  font-style: italic;
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Quotation</h1>
  </div>
  <div class="content">
    <p>Dear Sir,</p>
    <p>Thank you for your inquiry. We are pleased to provide our best offer for your kind reference:</p>

    <h3>Quotation Details</h3>
    <table class="quotation-table">
      <tr>
        <td><strong>POL:</strong></td>
        <td>${formData.pol || ""}</td>
      </tr>
      <tr>
        <td><strong>POD:</strong></td>
        <td>${formData.pod || ""}</td>
      </tr>
      <tr>
        <td><strong>Container Size:</strong></td>
        <td>${formData.containerSize || ""}</td>
      </tr>
      <tr>
        <td><strong>Rate:</strong></td>
        <td>${formData.rate || ""}</td>
      </tr>
      <tr>
        <td><strong>Ocean Freight:</strong></td>
        <td>${formData.Ocean_freight || ""}</td>
      </tr>
      <tr>
        <td><strong>Shipping Line Charges:</strong></td>
        <td>${formData.Shipping_line_charges || ""}</td>
      </tr>
      <tr>
        <td><strong>DO Charges:</strong></td>
        <td>${formData.DO_charges || ""}</td>
      </tr>
      <tr>
        <td><strong>Shipper Details:</strong></td>
        <td>${(formData.shipperDetails || "").replace(/\n/g, "<br/>")}</td>
      </tr>
      <tr>
        <td><strong>Consignee Details:</strong></td>
        <td>${(formData.consigneeDetails || "").replace(/\n/g, "<br/>")}</td>
      </tr>
      <tr>
        <td><strong>Terms:</strong></td>
        <td>${(formData.terms || "").replace(/\n/g, "<br/>")}</td>
      </tr>
      <tr>
        <td><strong>Validity:</strong></td>
        <td>${formatDate(formData.validity) || ""}</td>
      </tr>
    </table>

    <p style="margin-top: 25px;">
      We trust that the above offer is competitive and meets your requirements. We look forward to your kind confirmation for further bookings.
    </p>
  </div>
  <div class="signature">
    <p>Sincerely,</p>
    <p>SSR Logistic Solutions</p>
  </div>
</div>
</body>
</html>
`;
    return raw;
  }, [formData]);

  // Copy HTML to clipboard so user can paste into Outlook
  const copyHtmlToClipboard = async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        // Best: copy as real HTML
        const blob = new Blob([emailHtml], { type: "text/html" });
        const data = [new window.ClipboardItem({ "text/html": blob })];
        await navigator.clipboard.write(data);
        alert(
          "Formatted email copied.\n\nNow open Outlook → New Email → press Ctrl+V to paste."
        );
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        // Fallback: plain text HTML (format may not be perfect)
        await navigator.clipboard.writeText(emailHtml);
        alert(
          "HTML source copied as text.\n\nPaste into Outlook. If formatting is not perfect, your browser does not support rich HTML clipboard."
        );
      } else {
        alert("Clipboard API not supported in this browser.");
      }
    } catch (err) {
      console.error("Copy failed:", err);
      alert("Could not copy to clipboard. Please try again or copy manually.");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-10 bg-gray-100">
      <Navbar />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: form + buttons */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 text-black">
          <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center text-gray-800">
            Quotation Details
          </h3>

          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              openMailClient();
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Email", name: "email", type: "email" },
                { label: "Port of Loading (POL)", name: "pol", type: "text" },
                { label: "Port of Discharge (POD)", name: "pod", type: "text" },
              ].map((field, i) => (
                <div key={i}>
                  <label className="block text-gray-700 font-medium mb-2">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
              ))}

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Container Size
                </label>
                <select
                  name="containerSize"
                  value={formData.containerSize}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">Select size</option>
                  <option value="20'GP">20'GP</option>
                  <option value="20'HQ">20'HQ</option>
                  <option value="40'DRY">40'DRY</option>
                  <option value="40'HQ">40'HQ</option>
                  <option value="20'Reefer">20'Reefer</option>
                  <option value="40'Reefer">40'Reefer</option>
                  <option value="20'Flat rack">20'Flat rack</option>
                  <option value="40'Flat rack">40'Flat rack</option>
                  <option value="20'Open top">20'Open top</option>
                  <option value="40'Open top">40'Open top</option>
                </select>
              </div>

              {[
                { label: "Rate", name: "rate" },
                { label: "Ocean Freight", name: "Ocean_freight" },
                {
                  label: "Shipping Line Charges",
                  name: "Shipping_line_charges",
                },
                { label: "DO Charges", name: "DO_charges" },
                { label: "Shipper Details", name: "shipperDetails" },
                { label: "Consignee Details", name: "consigneeDetails" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-gray-700 font-medium mb-2">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Terms &amp; Conditions
              </label>
              <textarea
                name="terms"
                value={formData.terms}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              ></textarea>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Validity
              </label>
              <input
                type="date"
                name="validity"
                value={formData.validity}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition transform hover:scale-105"
              >
                Open Mail Client &amp; Send
              </button>

              <button
                type="button"
                onClick={copyHtmlToClipboard}
                className="bg-gray-800 hover:bg-gray-900 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition transform hover:scale-105"
              >
                Copy Formatted Email
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: live HTML email preview in iframe */}
        <div className="bg-white rounded-3xl shadow-2xl p-4 overflow-hidden">
          <h3 className="text-xl font-semibold mb-3 text-gray-800 text-center">
            Live Email Preview
          </h3>
          <div className="border rounded-xl overflow-hidden h-[600px]">
            <iframe
              title="Email Preview"
              style={{ width: "100%", height: "100%", border: "0" }}
              srcDoc={emailHtml}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationForm;
