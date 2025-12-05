import React, { useState } from "react";
import Navbar from "../NavBar/navbar";

const initialFormState = {
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
  introText:
    "Dear Sir,\n\nThank you for your inquiry. We are pleased to provide our best revised offer for your kind reference:",
  outroText:
    "We trust that the above offer is competitive and meets your requirements. We look forward to your kind confirmation for further bookings.\nSincerely\nThe Team",
};

const QuotationForm = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [showPreviewModal, setShowPreviewModal] = useState(false); // keep modal if you still want
  const [sending, setSending] = useState(false);

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
        setFormData(initialFormState);
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

  return (
    <div className="min-h-screen p-4 md:p-20 bg-gray-100">
      <Navbar />

      <div className="max-w-6xl mx-auto mt-8">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          📑 Quotation Details
        </h3>

        {/* 2‑column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* LEFT: FORM */}
          <div className="p-6 md:p-8 bg-white rounded-3xl shadow-2xl text-black">
            <form
              className="space-y-6"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* Basic fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: "Email", name: "email", type: "email" },
                  { label: "Port of Loading (POL)", name: "pol", type: "text" },
                  { label: "Port of Discharge (POD)", name: "pod", type: "text" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-gray-700 font-medium mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                ))}

                {/* Container Size */}
                <div>
                  <label className="block text-gray-700 font-medium mb-1">
                    Container Size
                  </label>
                  <select
                    name="containerSize"
                    value={formData.containerSize}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-gray-700 font-medium mb-1">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                ))}
              </div>

              {/* Shipper / Consignee */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Shipper Details
                </label>
                <textarea
                  name="shipperDetails"
                  value={formData.shipperDetails}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Consignee Details
                </label>
                <textarea
                  name="consigneeDetails"
                  value={formData.consigneeDetails}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              {/* Intro text */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Intro Message (before table)
                </label>
                <textarea
                  name="introText"
                  value={formData.introText}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              {/* Terms */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              {/* Validity */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Validity
                </label>
                <input
                  type="date"
                  name="validity"
                  value={formData.validity}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              {/* Outro text */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Closing Message (after table)
                </label>
                <textarea
                  name="outroText"
                  value={formData.outroText}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={sendEmail}
                  disabled={sending}
                  className={`px-6 py-2 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition ${
                    sending
                      ? "bg-blue-400 cursor-progress text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {sending ? "Sending..." : "✅ Send Email"}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: LIVE PREVIEW */}
          <div className="hidden md:block">
            <div className="bg-white border border-gray-200 shadow-md rounded-2xl p-6 text-sm text-gray-800 max-h-[80vh] overflow-auto">
              <div className="text-center border-b-2 border-blue-500 pb-2 mb-4">
                <h1 className="text-xl font-bold text-blue-600">
                  Revised Quotation
                </h1>
              </div>

              <div className="space-y-3">
                <p className="whitespace-pre-line">{formData.introText}</p>

                <h3 className="text-lg font-semibold mt-4">Quotation Details</h3>

                <table className="w-full table-fixed mt-2 text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-1 font-semibold w-50 pr-2">POL:</td>
                      <td className="py-1 whitespace-normal break-words">{formData.pol || "-"}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 font-semibold pr-2">POD:</td>
                      <td className="py-1 whitespace-normal break-words">{formData.pod || "-"}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 font-semibold pr-2">
                        Container Size:
                      </td>
                      <td className="py-1 whitespace-normal break-words">
                        {formData.containerSize || "-"}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 font-semibold pr-2">Rate:</td>
                      <td className="py-1 whitespace-normal break-words">{formData.rate || "-"}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 font-semibold pr-2">
                        Ocean Freight:
                      </td>
                      <td className="py-1 whitespace-normal break-words">
                        {formData.Ocean_freight || "-"}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 font-semibold pr-2">
                        Shipping Line Charges:
                      </td>
                      <td className="py-1 whitespace-normal break-words">
                        {formData.Shipping_line_charges || "-"}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 font-semibold pr-2">DO Charges:</td>
                      <td className="py-1 whitespace-normal break-words">
                        {formData.DO_charges || "-"}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 font-semibold pr-2">
                        Shipper Details:
                      </td>
                      <td className="py-1 whitespace-normal break-words">
                        {formData.shipperDetails || "-"}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 font-semibold pr-2">
                        Consignee Details:
                      </td>
                      <td className="py-1 whitespace-normal break-words">
                        {formData.consigneeDetails || "-"}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 font-semibold pr-2">Terms:</td>
                      <td className="py-1 whitespace-normal break-words">
                        {formData.terms || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 font-semibold pr-2">Validity:</td>
                      <td className="py-1 whitespace-normal break-words">
                        {formatDate(formData.validity) || "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p className="mt-4 whitespace-normal break-words">
                  {formData.outroText}
                </p>

                {/* <div className="mt-6 italic">
                  <p>Sincerely,</p>
                  <p>The Team</p>
                </div> */}

                <div className="mt-4 pt-3 border-t-2 border-blue-500 text-center text-xs text-gray-500">
                  {/* This is an automated email. Please do not reply. */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
};

export default QuotationForm;
