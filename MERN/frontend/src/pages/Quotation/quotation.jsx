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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const sendEmail = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("api/mail/send-quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData), // send form data as is
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
      } else {
        alert("Failed to send email. Try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Error sending email.");
    }
  };

  return (
    <div className="min-h-screen p-20">
      <Navbar />
      <div className="max-w-5xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          📑 Quotation Details
        </h3>

        <form onSubmit={sendEmail} className="space-y-8">
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

          {/* Submit */}
          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-3 rounded-xl shadow-lg transform hover:scale-105 transition duration-300 ease-in-out"
            >
              🚀 Send Quotation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuotationForm;
