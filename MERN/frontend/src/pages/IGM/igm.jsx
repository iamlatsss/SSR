import React, { useState, useEffect } from "react";
import Navbar from "../NavBar/navbar";

const INITIAL_KYC = {
  chas: ["ABC CHA Services", "Global CHA Solutions"],
  cfss: ["XYZ CFS Yard", "Seaport CFS Terminal"],
};

const IGMPage = () => {
  const EMPTY_FORM = {
    id: null, // for updating
    hblNo: "",
    mblNo: "",
    eta: "",
    etd: "",
    igmOn: "HBL",
    igmNo: "",
    chaName: "",
    cfsName: "",
    freightAmount: "",
    freightCurrency: "INR",
    doValidity: "",
    containerNumber: "",
  };

  const [igmForm, setIgmForm] = useState(EMPTY_FORM);
  const [kycData, setKycData] = useState(INITIAL_KYC);
  const [showAddNew, setShowAddNew] = useState({ type: null, value: "" });

  const [igmList, setIgmList] = useState([]); // list view
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false); // create vs edit

  // Load KYC and IGMs on mount
  useEffect(() => {
    const savedKyc = JSON.parse(localStorage.getItem("kycData") || "null");
    if (savedKyc) {
      setKycData((prev) => ({
        ...prev,
        ...savedKyc,
      }));
    }

    const savedIGMs = JSON.parse(localStorage.getItem("savedIGMs") || "[]");
    setIgmList(savedIGMs);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setIgmForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectKyc = (role, value) => {
    if (value === "ADD_NEW") {
      setShowAddNew({ type: role, value: "" });
    } else {
      setIgmForm((prev) => ({ ...prev, [role]: value }));
    }
  };

  const handleSaveNewKyc = () => {
    if (!showAddNew.type || !showAddNew.value.trim()) return;

    const trimmed = showAddNew.value.trim();
    setKycData((prev) => {
      const listName = showAddNew.type === "chaName" ? "chas" : "cfss";
      const updated = {
        ...prev,
        [listName]: [...(prev[listName] || []), trimmed],
      };
      localStorage.setItem("kycData", JSON.stringify(updated));
      return updated;
    });

    setIgmForm((prev) => ({
      ...prev,
      [showAddNew.type]: trimmed,
    }));

    setShowAddNew({ type: null, value: "" });
  };

  const handleCancelNewKyc = () => {
    setShowAddNew({ type: null, value: "" });
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setIgmForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setIsEdit(true);
    setIgmForm(record);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIgmForm(EMPTY_FORM);
  };

  const persistList = (list) => {
    setIgmList(list);
    localStorage.setItem("savedIGMs", JSON.stringify(list));
  };

  const handleSaveIGM = () => {
    if (isEdit) {
      // update existing
      const updatedList = igmList.map((item) =>
        item.id === igmForm.id ? { ...igmForm, savedAt: new Date().toISOString() } : item
      );
      persistList(updatedList);
      alert("IGM details updated successfully!");
    } else {
      // create new
      const id = Date.now();
      const newRecord = {
        ...igmForm,
        id,
        savedAt: new Date().toISOString(),
      };
      const updatedList = [...igmList, newRecord];
      persistList(updatedList);
      alert("IGM details saved successfully!");
    }
    closeModal();
  };

  // Filter for search
  const filteredIGMs = igmList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.hblNo || "").toLowerCase().includes(term) ||
      (item.mblNo || "").toLowerCase().includes(term) ||
      (item.igmNo || "").toLowerCase().includes(term) ||
      (item.containerNumber || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen p-15">
      <Navbar />

      <div className="max-w-7xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl text-gray-800">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          IGM Details
        </h3>

        {/* Toolbar: search + add */}
        <div className="flex justify-between items-center mb-6">
          <div className="w-full max-w-sm">
            <input
              type="text"
              placeholder="Search by HBL / MBL / IGM / Container"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            + Add IGM Details
          </button>
        </div>

        {/* List of IGMs */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">
                  HBL No.
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">
                  MBL No.
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">
                  IGM No.
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">
                  Container No.
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">
                  CHA
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">
                  CFS
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-800">
                  Saved At
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredIGMs.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-gray-800"
                    colSpan={7}
                  >
                    No IGM records found. Click &quot;Add IGM Details&quot; to
                    create one.
                  </td>
                </tr>
              )}

              {filteredIGMs.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openEditModal(item)}
                >
                  <td className="px-4 py-3 text-gray-800">{item.hblNo}</td>
                  <td className="px-4 py-3 text-gray-800">{item.mblNo}</td>
                  <td className="px-4 py-3 text-gray-800">{item.igmNo}</td>
                  <td className="px-4 py-3 text-gray-800">
                    {item.containerNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{item.chaName}</td>
                  <td className="px-4 py-3 text-gray-800">{item.cfsName}</td>
                  <td className="px-4 py-3 text-gray-800 text-xs">
                    {item.savedAt
                      ? new Date(item.savedAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit IGM Modal (form inside) */}
      {isModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={closeModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-gray-700">
            <div className="bg-white rounded-2xl p-8 w-full max-w-4xl shadow-2xl border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-gray-800">
                  {isEdit ? "Edit IGM Details" : "Add IGM Details"}
                </h4>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-gray-800 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>

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
                          value={igmForm.hblNo}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                          value={igmForm.mblNo}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                          value={igmForm.eta}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        ETD
                      </td>
                      <td className="w-1/4 px-4 py-4">
                        <input
                          type="date"
                          name="etd"
                          value={igmForm.etd}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                      </td>
                    </tr>

                    {/* IGM On / IGM No */}
                    <tr className="border-b border-gray-300">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        IGM On
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4">
                        <select
                          name="igmOn"
                          value={igmForm.igmOn}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          <option value="HBL">HBL</option>
                          <option value="MBL">MBL</option>
                        </select>
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                        IGM No.
                      </td>
                      <td className="w-1/4 px-4 py-4">
                        <input
                          type="text"
                          name="igmNo"
                          value={igmForm.igmNo}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="Enter IGM number"
                        />
                      </td>
                    </tr>

                    {/* CHA / CFS */}
                    <tr className="border-b border-gray-300 text-gray-700">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50 text-gray-700">
                        CHA Name
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 text-gray-700">
                        <select
                          name="chaName"
                          value={igmForm.chaName}
                          onChange={(e) =>
                            handleSelectKyc("chaName", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          <option value="">Select CHA</option>
                          {kycData.chas.map((cha) => (
                            <option key={cha} value={cha}>
                              {cha}
                            </option>
                          ))}
                          <option value="ADD_NEW">+ Add new CHA</option>
                        </select>
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50 text-gray-700">
                        CFS Name
                      </td>
                      <td className="w-1/4 px-4 py-4 text-gray-700">
                        <select
                          name="cfsName"
                          value={igmForm.cfsName}
                          onChange={(e) =>
                            handleSelectKyc("cfsName", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          <option value="">Select CFS</option>
                          {kycData.cfss.map((cfs) => (
                            <option key={cfs} value={cfs}>
                              {cfs}
                            </option>
                          ))}
                          <option value="ADD_NEW">+ Add new CFS</option>
                        </select>
                      </td>
                    </tr>

                    {/* Freight / DO Validity */}
                    <tr className="border-b border-gray-300 text-gray-700">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50 text-gray-700">
                        Freight Amount
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 text-gray-700">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            name="freightAmount"
                            value={igmForm.freightAmount}
                            onChange={handleChange}
                            className="w-1.5/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            placeholder="Amount"
                          />
                          <select
                            name="freightCurrency"
                            value={igmForm.freightCurrency}
                            onChange={handleChange}
                            className="w-1.5/3 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          >
                            <option value="INR">INR</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>
                      </td>
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50 text-gray-700">
                        DO Validity
                      </td>
                      <td className="w-1/4 px-4 py-4 text-gray-700">
                        <input
                          type="date"
                          name="doValidity"
                          value={igmForm.doValidity}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                      </td>
                    </tr>

                    {/* Container Number */}
                    <tr className="border-b border-gray-300 text-gray-700">
                      <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50 text-gray-700">
                        Container Number
                      </td>
                      <td colSpan={3} className="px-4 py-4 text-gray-700">
                        <input
                          type="text"
                          name="containerNumber"
                          value={igmForm.containerNumber}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter container number"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Modal footer: Save only */}
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 border border-gray-300 text-gray-800 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveIGM}
                  className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white text-gray-700 font-semibold rounded-lg text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Nested KYC modal still works on top of this */}
          {showAddNew.type && (
            <>
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-60"
                onClick={handleCancelNewKyc}
              />
              <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
                  <h4 className="text-xl font-bold text-gray-800 mb-6">
                    Add New {showAddNew.type === "chaName" ? "CHA" : "CFS"}
                  </h4>
                  <input
                    type="text"
                    value={showAddNew.value}
                    onChange={(e) =>
                      setShowAddNew((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    placeholder={`Enter ${showAddNew.type === "chaName" ? "CHA" : "CFS"
                      } name`}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-gray-900 placeholder-gray-500"
                  />
                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={handleCancelNewKyc}
                      className="flex-1 py-3 px-6 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewKyc}
                      disabled={!showAddNew.value.trim()}
                      className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default IGMPage;
