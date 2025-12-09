import React, { useState, useEffect } from "react";
import Navbar from "../NavBar/navbar";

const PORTS = [
  "Nhava Sheva, INNSA",
  "Mundra, INMUN",
  "Chennai, INMAA",
  "Mumbai, INBOM",
  "Singapore, SGSIN",
  "Shanghai, CNSHA",
  "Rotterdam, NLRTM",
  "Jebel Ali, AEJEA",
];

const CONTAINER_SIZES = ["20' GP", "40' GP", "40' HC", "45' HC"];
const CARGO_TYPES = [
  "HAZ",
  "General Cargo",
  "Special Equipment",
  "Machineries",
  "Spare Parts",
];

const INITIAL_KYC = {
  shippers: ["ABC Exports Pvt Ltd", "Global Traders Inc"],
  consignees: ["XYZ Imports LLC", "Oceanic Retailers"],
  agents: ["SeaLink Logistics", "PortSide Agencies"],
};

const BookingWorkspace = () => {
  const [kycData, setKycData] = useState(INITIAL_KYC);
  const [jobNo, setJobNo] = useState(6000);
  const [activeTab, setActiveTab] = useState("booking");

  const [bookingForm, setBookingForm] = useState({
    dateOfNomination: "",
    shipper: "",
    consignee: "",
    pol: "",
    pod: "",
    containerSize: "",
    containerCount: 1,
    agent: "",
  });

  const [updateForm, setUpdateForm] = useState({
    hblNo: "",
    mblNo: "",
    eta: "",
    etd: "",
    shipperInvoiceNo: "",
    netWeight: "",
    grossWeight: "",
    cargoType: "",
    shippingLineName: "",
    hblTelexReceived: "No",
    mblTelexReceived: "No",
  });

  const [showAddNew, setShowAddNew] = useState({ type: null, value: "" });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setBookingForm((prev) => ({ ...prev, dateOfNomination: today }));

    const lastJobNo = localStorage.getItem("lastJobNo");
    if (lastJobNo) {
      setJobNo(parseInt(lastJobNo, 10) + 1);
    }
  }, []);

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateChange = (e) => {
    const { name, value } = e.target;
    setUpdateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectKyc = (role, value) => {
    if (value === "ADD_NEW") {
      setShowAddNew({ type: role, value: "" });
    } else {
      setBookingForm((prev) => ({ ...prev, [role]: value }));
    }
  };

  const handleSaveNewKyc = () => {
    if (!showAddNew.type || !showAddNew.value.trim()) return;

    const trimmed = showAddNew.value.trim();
    setKycData((prev) => {
      const listName = showAddNew.type + "s";
      return {
        ...prev,
        [listName]: [...prev[listName], trimmed],
      };
    });

    setBookingForm((prev) => ({
      ...prev,
      [showAddNew.type]: trimmed,
    }));

    setShowAddNew({ type: null, value: "" });
  };

  const handleCancelNewKyc = () => {
    setShowAddNew({ type: null, value: "" });
  };

  // FIXED: Single correct handleSaveBooking function
  const handleSaveBooking = () => {
    const jobData = { jobNo, ...bookingForm, status: "draft", updates: [] };

    // Load existing jobs
    const existingJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
    const updatedJobs = existingJobs
      .filter((j) => j.jobNo !== jobNo)
      .concat(jobData);

    localStorage.setItem("savedJobs", JSON.stringify(updatedJobs));
    localStorage.setItem("lastJobNo", jobNo.toString());

    console.log("Booking saved:", jobData);
    alert("Booking saved successfully!");
  };

  // FIXED: Single correct handleSaveBookingUpdate function
  const handleSaveBookingUpdate = () => {
    const updateData = updateForm;
    const existingJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
    const jobIndex = existingJobs.findIndex((j) => j.jobNo === jobNo);

    if (jobIndex !== -1) {
      existingJobs[jobIndex].updates = existingJobs[jobIndex].updates || [];
      existingJobs[jobIndex].updates.push({
        ...updateData,
        date: new Date().toISOString().slice(0, 10),
      });
      existingJobs[jobIndex].status = "confirmed";
      localStorage.setItem("savedJobs", JSON.stringify(existingJobs));
    }

    console.log("Booking update saved:", updateData);
    alert("Booking update saved successfully!");
  };

  const handleNewBooking = () => {
    setJobNo((prev) => {
      const next = prev + 1;
      localStorage.setItem("lastJobNo", next.toString());
      return next;
    });

    const today = new Date().toISOString().slice(0, 10);
    setBookingForm({
      dateOfNomination: today,
      shipper: "",
      consignee: "",
      pol: "",
      pod: "",
      containerSize: "",
      containerCount: 1,
      agent: "",
    });

    setUpdateForm({
      hblNo: "",
      mblNo: "",
      eta: "",
      etd: "",
      shipperInvoiceNo: "",
      netWeight: "",
      grossWeight: "",
      cargoType: "",
      shippingLineName: "",
      hblTelexReceived: "No",
      mblTelexReceived: "No",
    });
  };

  return (
    <div className="min-h-screen p-15">
      <Navbar />

      <div className="max-w-7xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl text-black">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          Booking Page
        </h3>

        {/* Header Row */}
        <div className="flex justify-between items-center mb-8 bg-gray-50 p-6 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm">
              Job #{jobNo}
            </div>
            <div className="text-sm text-gray-600">
              Date of Nomination:{" "}
              <span className="font-medium">{bookingForm.dateOfNomination}</span>
            </div>
          </div>
          <button
            onClick={handleNewBooking}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2 rounded-lg text-sm transition-colors"
          >
            + New Booking
          </button>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              className={`px-8 py-3 font-semibold text-sm rounded-lg transition-colors ${
                activeTab === "booking"
                  ? "bg-white text-gray-800 shadow-md"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
              }`}
              onClick={() => setActiveTab("booking")}
            >
              New Booking
            </button>
            <button
              type="button"
              className={`px-8 py-3 font-semibold text-sm rounded-lg transition-colors ml-1 ${
                activeTab === "update"
                  ? "bg-white text-gray-800 shadow-md"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
              }`}
              onClick={() => setActiveTab("update")}
            >
              Booking Update
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            {activeTab === "booking" && (
              <div className="space-y-6">
                <table className="w-full border border-gray-300 text-sm">
                  <tbody>
                    {/* Date / Job No */}
                    <tr className="border-b border-gray-300">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Date of Nomination
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4">
                        <input
                          type="date"
                          name="dateOfNomination"
                          value={bookingForm.dateOfNomination}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled
                        />
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Job No.
                      </td>
                      <td className="w-1/4 px-4 py-4">
                        <input
                          type="text"
                          value={jobNo}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-semibold text-lg focus:outline-none"
                          disabled
                        />
                      </td>
                    </tr>

                    {/* Shipper / Consignee */}
                    <tr className="border-b border-gray-300">
                      <td className="border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Shipper
                      </td>
                      <td className="border-r border-gray-300 px-4 py-4">
                        <select
                          name="shipper"
                          value={bookingForm.shipper}
                          onChange={(e) => handleSelectKyc("shipper", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select shipper</option>
                          {kycData.shippers.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                          <option value="ADD_NEW">+ Add new shipper</option>
                        </select>
                      </td>
                      <td className="border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Consignee
                      </td>
                      <td className="px-4 py-4">
                        <select
                          name="consignee"
                          value={bookingForm.consignee}
                          onChange={(e) => handleSelectKyc("consignee", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select consignee</option>
                          {kycData.consignees.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="ADD_NEW">+ Add new consignee</option>
                        </select>
                      </td>
                    </tr>

                    {/* POL / POD */}
                    <tr className="border-b border-gray-300">
                      <td className="border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        POL
                      </td>
                      <td className="border-r border-gray-300 px-4 py-4">
                        <select
                          name="pol"
                          value={bookingForm.pol}
                          onChange={handleBookingChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select POL</option>
                          {PORTS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        POD
                      </td>
                      <td className="px-4 py-4">
                        <select
                          name="pod"
                          value={bookingForm.pod}
                          onChange={handleBookingChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select POD</option>
                          {PORTS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>

                    {/* Container Size / Count */}
                    <tr className="border-b border-gray-300">
                      <td className="border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Container Size
                      </td>
                      <td className="border-r border-gray-300 px-4 py-4">
                        <select
                          name="containerSize"
                          value={bookingForm.containerSize}
                          onChange={handleBookingChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select size</option>
                          {CONTAINER_SIZES.map((cs) => (
                            <option key={cs} value={cs}>
                              {cs}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        No. of Containers
                      </td>
                      <td className="px-4 py-4">
                        <select
                          name="containerCount"
                          value={bookingForm.containerCount}
                          onChange={handleBookingChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>

                    {/* Agent */}
                    <tr className="border-b border-gray-300">
                      <td className="border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Agent
                      </td>
                      <td colSpan={3} className="px-4 py-4">
                        <select
                          name="agent"
                          value={bookingForm.agent}
                          onChange={(e) => handleSelectKyc("agent", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select agent</option>
                          {kycData.agents.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                          <option value="ADD_NEW">+ Add new agent</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-center mt-8">
                  <button
                    type="button"
                    onClick={handleSaveBooking}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-12 py-3 rounded-lg text-sm transition-colors shadow-lg hover:shadow-xl"
                  >
                    Save Booking
                  </button>
                </div>
              </div>
            )}

            {activeTab === "update" && (
              <div className="space-y-6">
                <table className="w-full border border-gray-300 text-sm">
                  <tbody>
                    {/* HBL / MBL */}
                    <tr className="border-b border-gray-300">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        HBL No.
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4">
                        <input
                          type="text"
                          name="hblNo"
                          value={updateForm.hblNo}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter HBL number"
                        />
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        MBL No.
                      </td>
                      <td className="w-1/4 px-4 py-4">
                        <input
                          type="text"
                          name="mblNo"
                          value={updateForm.mblNo}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter MBL number"
                        />
                      </td>
                    </tr>

                    {/* ETA / ETD */}
                    <tr className="border-b border-gray-300">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        ETA
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4">
                        <input
                          type="date"
                          name="eta"
                          value={updateForm.eta}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        ETD
                      </td>
                      <td className="w-1/4 px-4 py-4">
                        <input
                          type="date"
                          name="etd"
                          value={updateForm.etd}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                    </tr>

                    {/* Weights */}
                    <tr className="border-b border-gray-300">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Net Weight (kg)
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4">
                        <input
                          type="number"
                          name="netWeight"
                          value={updateForm.netWeight}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Gross Weight (kg)
                      </td>
                      <td className="w-1/4 px-4 py-4">
                        <input
                          type="number"
                          name="grossWeight"
                          value={updateForm.grossWeight}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </td>
                    </tr>

                    {/* Cargo Type / Shipping Line */}
                    <tr className="border-b border-gray-300">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Cargo Type
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4">
                        <select
                          name="cargoType"
                          value={updateForm.cargoType}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select type</option>
                          {CARGO_TYPES.map((ct) => (
                            <option key={ct} value={ct}>
                              {ct}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Shipping Line
                      </td>
                      <td className="w-1/4 px-4 py-4">
                        <input
                          type="text"
                          name="shippingLineName"
                          value={updateForm.shippingLineName}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g. Maersk, MSC"
                        />
                      </td>
                    </tr>

                    {/* Shipper Invoice */}
                    <tr className="border-b border-gray-300">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        Shipper Invoice No.
                      </td>
                      <td colSpan={3} className="px-4 py-4">
                        <input
                          type="text"
                          name="shipperInvoiceNo"
                          value={updateForm.shipperInvoiceNo}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter invoice number"
                        />
                      </td>
                    </tr>

                    {/* Telex Received */}
                    <tr className="border-b border-gray-300">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        HBL Telex
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4">
                        <select
                          name="hblTelexReceived"
                          value={updateForm.hblTelexReceived}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        MBL Telex
                      </td>
                      <td className="w-1/4 px-4 py-4">
                        <select
                          name="mblTelexReceived"
                          value={updateForm.mblTelexReceived}
                          onChange={handleUpdateChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-center mt-8">
                  <button
                    type="button"
                    onClick={handleSaveBookingUpdate}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-16 py-3 rounded-lg text-sm transition-colors shadow-lg hover:shadow-xl"
                  >
                    Save Booking Update
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Quick Summary */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h4 className="font-bold text-lg mb-4 text-gray-800 text-center">
                Quick Summary
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Job No:</span> <strong>{jobNo}</strong>
                </div>
                <div>
                  <span className="font-medium">Date:</span> {bookingForm.dateOfNomination}
                </div>
                <div>
                  <span className="font-medium">Shipper:</span> {bookingForm.shipper || "—"}
                </div>
                <div>
                  <span className="font-medium">Consignee:</span> {bookingForm.consignee || "—"}
                </div>
                <div className="font-medium">
                  Route: {bookingForm.pol && bookingForm.pod
                    ? `${bookingForm.pol} → ${bookingForm.pod}`
                    : "—"}
                </div>
                <div className="font-medium">
                  Containers: {bookingForm.containerSize
                    ? `${bookingForm.containerCount} × ${bookingForm.containerSize}`
                    : "—"}
                </div>
                <div>
                  <span className="font-medium">Agent:</span> {bookingForm.agent || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New KYC Modal */}
      {showAddNew.type && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={handleCancelNewKyc}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
              <h4 className="text-xl font-bold text-gray-800 mb-6 capitalize">
                Add New {showAddNew.type}
              </h4>
              <input
                type="text"
                value={showAddNew.value}
                onChange={(e) =>
                  setShowAddNew((prev) => ({ ...prev, value: e.target.value }))
                }
                placeholder={`Enter ${showAddNew.type} name`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={handleCancelNewKyc}
                  className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewKyc}
                  disabled={!showAddNew.value.trim()}
                  className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save {showAddNew.type}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BookingWorkspace;
