import React, { useState } from "react";
import Navbar from "../NavBar/navbar";

const initialFormState = {
  date: "",
  branch: "",
  name: "",
  address: "",
  customer_type: "",
  status: "",
  year_of_establishment: "",
  director: "",
  pan: "",
  aadhar: "",
  branch_office: "",
  office_address: "",
  state: "",
  gstin: "",
  gst_remarks: "",
  annual_turnover: "",
  mto_iec_cha_validity: "",
  aeo_validity: "",
  export_commodities: "",
  email_export: "",
  email_import: "",
  bank_details: "",
  contact_person_export: "",
  contact_person_import: "",
};

export default function KycForm() {
  const [formData, setFormData] = useState(initialFormState);
  const [files, setFiles] = useState({
    gstin_doc: null,
    pan_doc: null,
    iec_doc: null,
    kyc_letterhead_doc: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: selected } = e.target;
    setFiles((prev) => ({ ...prev, [name]: selected[0] || null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const formDataToSend = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          formDataToSend.append(key, file);
        }
      });

      const response = await fetch("/api/kyc/add", {
        method: "POST",
        body: formDataToSend,
      });

      const res_data = await response.json();

      if (response.ok) {
        setMessage("Form submitted successfully!");
        setFormData(initialFormState);
        setFiles({
          gstin_doc: null,
          pan_doc: null,
          iec_doc: null,
          kyc_letterhead_doc: null,
        });
      } else {
        setMessage(res_data?.message || "Failed to submit the form.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Error submitting the form.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-15">
      <Navbar />
      <div className="max-w-5xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl text-black">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          KYC Customers Form
        </h3>

        <form id="kycForm" onSubmit={handleSubmit}>
          <table className="w-full border border-gray-400 text-sm">
            <tbody>
              {/* Date / Branch */}
              <tr className="border-b border-gray-400">
                <td className="w-1/4 border-r border-gray-400 px-1 py-1 font-medium">
                  Date
                </td>
                <td className="w-1/4 border-r border-gray-400 px-1 py-1">
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full outline-none"
                    required
                  />
                </td>
                <td className="w-1/4 border-r border-gray-400 px-1 py-1 font-medium">
                  Branch
                </td>
                <td className="w-1/4 px-1 py-1">
                  <input
                    type="text"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    className="w-full outline-none"
                    required
                  />
                </td>
              </tr>

              {/* Name of the Customer */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Name of the Customer
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full outline-none"
                    required
                  />
                </td>
              </tr>

              {/* Address */}
              <tr className="border-b border-gray-400 align-top">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Address along with the State, Pin Code, Telephone Number and
                  Website
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full outline-none resize-none"
                    rows={2}
                    required
                  />
                </td>
              </tr>

              {/* Constitution - Type */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Constitution - Type of Customer (Pvt Limited, LTD,
                  Partnership, Proprietorship etc.)
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="text"
                    name="customer_type"
                    value={formData.customer_type}
                    onChange={handleChange}
                    className="w-full outline-none"
                    required
                  />
                </td>
              </tr>

              {/* Constitution - Status */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Constitution - Status of Customer (Shipping Line, Exporter,
                  Importer, CHA, Freight Forwarder, Business Associate)
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="text"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full outline-none"
                    required
                  />
                </td>
              </tr>

              {/* Year of Establishment */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Year of Establishment
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="text"
                    name="year_of_establishment"
                    value={formData.year_of_establishment}
                    onChange={handleChange}
                    className="w-full outline-none"
                    required
                  />
                </td>
              </tr>

              {/* Director / Partner */}
              <tr className="border-b border-gray-400 align-top">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Name of Director/Partner with address and email Id
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <textarea
                    name="director"
                    value={formData.director}
                    onChange={handleChange}
                    className="w-full outline-none resize-none"
                    rows={2}
                    required
                  />
                </td>
              </tr>

              {/* PAN */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  PAN Number of the customer
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="text"
                    name="pan"
                    value={formData.pan}
                    onChange={handleChange}
                    className="w-full outline-none"
                    required
                  />
                </td>
              </tr>

              {/* Aadhar */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Aadhar Card No. (In case of Sole Proprietor)
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="text"
                    name="aadhar"
                    value={formData.aadhar}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
              </tr>

              {/* Branch Offices */}
              <tr className="border-b border-gray-400 align-top">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Branch Offices &amp; Address
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <textarea
                    name="branch_office"
                    value={formData.branch_office}
                    onChange={handleChange}
                    className="w-full outline-none resize-none"
                    rows={2}
                  />
                </td>
              </tr>

              {/* GSTIN Details header row */}
              <tr className="border-b border-gray-400 bg-gray-100">
                <td className="border-r border-gray-400 px-1 py-1 font-semibold">
                  GSTIN Details
                </td>
                <td className="border-r border-gray-400 px-1 py-1 font-semibold">
                  Office/Billing Address
                </td>
                <td className="border-r border-gray-400 px-1 py-1 font-semibold">
                  State
                </td>
                <td className="px-1 py-1 font-semibold">GSTIN</td>
              </tr>

              {/* GSTIN Details row */}
              <tr className="border-b border-gray-400 align-top">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Remarks, if Any
                </td>
                <td className="border-r border-gray-400 px-1 py-1">
                  <textarea
                    name="office_address"
                    value={formData.office_address}
                    onChange={handleChange}
                    className="w-full outline-none resize-none"
                    rows={2}
                  />
                </td>
                <td className="border-r border-gray-400 px-1 py-1">
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
              </tr>

              {/* GST Remarks */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  GST Remarks
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="text"
                    name="gst_remarks"
                    value={formData.gst_remarks}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
              </tr>

              {/* Annual Turnover */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Annual Turnover
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="text"
                    name="annual_turnover"
                    value={formData.annual_turnover}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
              </tr>

              {/* MTO / IEC / CHA and validity */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  MTO/IEC Code/CHA and validity
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="text"
                    name="mto_iec_cha_validity"
                    value={formData.mto_iec_cha_validity}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
              </tr>

              {/* AEO with Validity */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  AEO with Validity
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="text"
                    name="aeo_validity"
                    value={formData.aeo_validity}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
              </tr>

              {/* Export Commodities */}
              <tr className="border-b border-gray-400 align-top">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Export Commodities
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <textarea
                    name="export_commodities"
                    value={formData.export_commodities}
                    onChange={handleChange}
                    className="w-full outline-none resize-none"
                    rows={2}
                  />
                </td>
              </tr>

              {/* Email for Export */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Email ID for receiving BL Drafts, Export Queries, DSR, Invoice
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="email"
                    name="email_export"
                    value={formData.email_export}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
              </tr>

              {/* Email for Import */}
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Email Id for receiving Arrival Notices, DO, Import Queries,
                  DSR, Invoices
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <input
                    type="email"
                    name="email_import"
                    value={formData.email_import}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
              </tr>

              {/* Bank Details */}
              <tr className="border-b border-gray-400 align-top">
                <td className="border-r border-gray-400 px-1 py-1 font-medium">
                  Bank Details
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <textarea
                    name="bank_details"
                    value={formData.bank_details}
                    onChange={handleChange}
                    className="w-full outline-none resize-none"
                    rows={2}
                  />
                </td>
              </tr>

              {/* Contact Person with Phone Number */}
              <tr className="border-b border-gray-400 bg-gray-100">
                <td className="border-r border-gray-400 px-1 py-1 font-semibold">
                  Contact Person with Phone Number
                </td>
                <td className="border-r border-gray-400 px-1 py-1 font-semibold">
                  Export
                </td>
                <td colSpan={2} className="px-1 py-1 font-semibold">
                  Import
                </td>
              </tr>
              <tr className="border-b border-gray-400">
                <td className="border-r border-gray-400 px-1 py-1"></td>
                <td className="border-r border-gray-400 px-1 py-1">
                  <input
                    type="text"
                    name="contact_person_export"
                    value={formData.contact_person_export}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
                <td colSpan={2} className="px-1 py-1">
                  <input
                    type="text"
                    name="contact_person_import"
                    value={formData.contact_person_import}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </td>
              </tr>

              {/* Document uploads row */}
              <tr className="border-b border-gray-400 align-top">
                <td className="border-r border-gray-400 px-1 py-1 font-medium align-top">
                  Upload Documents (self-attested copies)
                </td>
                <td colSpan={3} className="px-1 py-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-xs">
                        GST Certificate
                      </label>
                      <input
                        type="file"
                        name="gstin_doc"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="block w-full text-xs text-gray-700
                     file:mr-3 file:py-1 file:px-3
                     file:rounded-lg file:border-0
                     file:text-xs file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-xs">
                        PAN Card
                      </label>
                      <input
                        type="file"
                        name="pan_doc"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="block w-full text-xs text-gray-700
                     file:mr-3 file:py-1 file:px-3
                     file:rounded-lg file:border-0
                     file:text-xs file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-xs">
                        IEC Form
                      </label>
                      <input
                        type="file"
                        name="iec_doc"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="block w-full text-xs text-gray-700
                     file:mr-3 file:py-1 file:px-3
                     file:rounded-lg file:border-0
                     file:text-xs file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-xs">
                        KYC Form (Signed with Letterhead)
                      </label>
                      <input
                        type="file"
                        name="kyc_letterhead_doc"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="block w-full text-xs text-gray-700
                     file:mr-3 file:py-1 file:px-3
                     file:rounded-lg file:border-0
                     file:text-xs file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Submit + message */}
          <div className="flex justify-center mt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2 rounded-lg text-sm"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>

          {message && (
            <div className="text-center text-xs text-gray-700 mt-1">
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
