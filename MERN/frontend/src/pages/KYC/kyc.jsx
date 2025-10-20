import React, { useState } from "react";
import Navbar from "../NavBar/navbar";

const KYC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-amber-200 via-white to-white flex items-center justify-center p-25">
      <Navbar />
      <form
        id="kycForm"
        method="POST"
        action="/submit_kyc"
        className="w-full max-w-4xl bg-white shadow-lg rounded-2xl p-8 space-y-6"
      >
        {/* General Information */}
        <div>
          <h2 className="text-xl font-semibold border-b-2 border-blue-500 pb-2 mb-4">
            General Information
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium">Date</label>
              <input
                type="date"
                name="date"
                required
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Branch</label>
              <input
                type="text"
                name="branch"
                required
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div>
          <h2 className="text-xl font-semibold border-b-2 border-blue-500 pb-2 mb-4">
            Customer Information
          </h2>
          <div>
            <label className="block text-sm font-medium">
              Name of the Customer
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Address with State, Pin Code, Phone, Website
            </label>
            <textarea
              name="address"
              required
              className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400 resize-none"
            ></textarea>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium">
                Type of Customer
              </label>
              <input
                type="text"
                name="customer_type"
                required
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Status of Customer
              </label>
              <input
                type="text"
                name="status"
                required
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium">
                Year of Establishment
              </label>
              <input
                type="text"
                name="year"
                required
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">PAN Number</label>
              <input
                type="text"
                name="pan"
                required
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Name of Director/Partner with address and email
            </label>
            <textarea
              name="director"
              required
              className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400 resize-none"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Aadhar Card No. (For Sole Proprietor)
            </label>
            <input
              type="text"
              name="aadhar"
              required
              className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Branch Offices & Address
            </label>
            <textarea
              name="branch_office"
              required
              className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400 resize-none"
            ></textarea>
          </div>
        </div>

        {/* GST Details */}
        <div>
          <h2 className="text-xl font-semibold border-b-2 border-blue-500 pb-2 mb-4">
            GST Details
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium">
                Office/Billing Address
              </label>
              <textarea
                name="office_address"
                required
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400 resize-none"
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium">State</label>
              <input
                type="text"
                name="state"
                required
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">GSTIN</label>
              <input
                type="text"
                name="gstin"
                required
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Remarks</label>
              <textarea
                name="remarks"
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400 resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Submit
          </button>
          <button
            type="view"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition pd-4 ml-4"
          >
            View All
          </button>
        </div>
      </form>
    </div>
  );
};

export default KYC;
