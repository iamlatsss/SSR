import React, { useState, useEffect } from "react";
import Navbar from "../NavBar/navbar";

const initialFormState = {
  branch: "",
  name: "",
  year_of_establishment: "",
  pan: "",
  customer_type: "",
  director: "",
  aadhar: "",
  branch_office: "",
  office_address: "",
  state: "",
  gstin: "",
  remarks: "",
};

export default function KycForm() {
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch('/api/kyc/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      console.log(response)
      if (response.ok) {
        setMessage('Form submitted successfully!');
        setFormData(initialFormState); // Reset form after success
      } else {
        setMessage('Failed to submit the form.');
      }
    } catch (error) {
      setMessage('Error submitting the form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-20">
      <Navbar />
      <div className="max-w-5xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl text-black">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          🧾 KYC Form
        </h3>

        <form
          id="kycForm"
          method="POST"
          action="/submit_kyc"
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          {/* General Information */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              General Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Branch</label>
                <input
                  type="text"
                  name="branch"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Customer Information
            </h2>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Name of the Customer</label>
              <input
                type="text"
                name="name"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                Address with State, Pin Code, Phone, Website
              </label>
              <textarea
                name="address"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Type of Customer</label>
                <input
                  type="text"
                  name="customer_type"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Status of Customer</label>
                <input
                  type="text"
                  name="status"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Year of Establishment</label>
                <input
                  type="text"
                  name="year"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">PAN Number</label>
                <input
                  type="text"
                  name="pan"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                Name of Director/Partner with address and email
              </label>
              <textarea
                name="director"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Aadhar Card No. (For Sole Proprietor)</label>
              <input
                type="text"
                name="aadhar"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Branch Offices & Address</label>
              <textarea
                name="branch_office"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
              ></textarea>
            </div>
          </div>

          {/* GST Details */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">GST Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Office/Billing Address</label>
                <textarea
                  name="office_address"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                ></textarea>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">State</label>
                <input
                  type="text"
                  name="state"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">GSTIN</label>
                <input
                  type="text"
                  name="gstin"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Remarks</label>
                <textarea
                  name="remarks"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-3 rounded-xl shadow-lg transform hover:scale-105 transition duration-300 ease-in-out"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className="text-center text-sm text-gray-700 mt-2">
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
