import React, { useState } from "react";
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

  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Corrected sendEmail (no nested function)
  const sendEmail = async () => {
    setSending(true);
    try {
      const response = await fetch("api/mail/send-quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        alert("Quotation has been emailed successfully!");
        setFormData({
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
        setShowPreview(false);
      } else {
        alert("Failed to send email. Try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Error sending email.");
    } finally {
      setSending(false);
    }
  };

  const openPreview = (e) => {
    e.preventDefault();
    setShowPreview(true);
  };

  const closePreview = () => setShowPreview(false);

  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString();
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="min-h-screen p-20">
      <Navbar />
      <div className="max-w-5xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl text-black">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          📑 Quotation Details
        </h3>

        <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
          {/* Grid fields */}
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

            {/* Container Size dropdown */}
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

            {/* Other text fields */}
            {[
              { label: "Rate", name: "rate" },
              { label: "Ocean Freight", name: "Ocean_freight" },
              { label: "Shipping Line Charges", name: "Shipping_line_charges" },
              { label: "DO Charges", name: "DO_charges" },
              { label: "Shipper Details", name: "shipperDetails" },
              { label: "Consignee Details", name: "consigneeDetails" },
            ].map((field, i) => (
              <div key={i}>
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

          {/* Terms */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Terms & Conditions
            </label>
            <textarea
              name="terms"
              value={formData.terms}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            ></textarea>
          </div>

          {/* Validity */}
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

          {/* Action Buttons: Preview */}
          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={openPreview}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-xl shadow transition transform hover:scale-105"
            >
              👀 Preview
            </button>
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-6"
          aria-modal="true"
          role="dialog"
        >
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={closePreview}
          />

          {/* modal box */}
          <div className="relative bg-white w-full max-w-3xl mx-auto rounded-2xl shadow-2xl z-60 overflow-auto">
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  Preview Quotation
                </h2>
                <button
                  onClick={closePreview}
                  className="text-gray-500 hover:text-gray-800 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 space-y-4 text-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="mt-1">{formData.email || "-"}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Validity</p>
                    <p className="mt-1">{formatDate(formData.validity) || "-"}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">POL</p>
                    <p className="mt-1">{formData.pol || "-"}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">POD</p>
                    <p className="mt-1">{formData.pod || "-"}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Container</p>
                    <p className="mt-1">{formData.containerSize || "-"}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Rate</p>
                    <p className="mt-1">{formData.rate || "-"}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Ocean Freight</p>
                    <p className="mt-1">{formData.Ocean_freight || "-"}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Shipping Line Charges</p>
                    <p className="mt-1">{formData.Shipping_line_charges || "-"}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">DO Charges</p>
                    <p className="mt-1">{formData.DO_charges || "-"}</p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-600">Shipper Details</p>
                    <p className="mt-1 whitespace-pre-line">{formData.shipperDetails || "-"}</p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-600">Consignee Details</p>
                    <p className="mt-1 whitespace-pre-line">{formData.consigneeDetails || "-"}</p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-600">Terms & Conditions</p>
                    <p className="mt-1 whitespace-pre-line">{formData.terms || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closePreview}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-medium"
                >
                  Edit
                </button>

                <button
                  onClick={sendEmail}
                  disabled={sending}
                  className={`px-4 py-2 rounded-xl font-medium shadow-lg transform hover:scale-105 transition ${
                    sending
                      ? "bg-blue-400 cursor-progress text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {sending ? "Sending..." : "✅ Confirm & Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationForm;
