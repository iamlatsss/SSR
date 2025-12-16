import React, { useState, useEffect } from "react";
import Navbar from "../NavBar/navbar";

// You can later load these from KYC localStorage or API
const INITIAL_KYC = {
  chas: ["ABC CHA Services", "Global CHA Solutions"],
  cfss: ["XYZ CFS Yard", "Seaport CFS Terminal"],
};

const IGMPage = () => {
  const [igmForm, setIgmForm] = useState({
    hblNo: "",
    mblNo: "",
    eta: "",
    etd: "",
    igmOn: "HBL", // HBL or MBL
    igmNo: "",
    chaName: "",
    cfsName: "",
    freightAmount: "",
    doValidity: "",
    containerNumber: "",
  });

  const [kycData, setKycData] = useState(INITIAL_KYC);
  const [showAddNew, setShowAddNew] = useState({ type: null, value: "" });

  useEffect(() => {
    // Optional: if you have KYC saved in localStorage, hydrate from there
    const savedKyc = JSON.parse(localStorage.getItem("kycData") || "null");
    if (savedKyc) {
      setKycData((prev) => ({
        ...prev,
        ...savedKyc,
      }));
    }
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
      const listName =
        showAddNew.type === "chaName" ? "chas" : "cfss"; // map to arrays
      const updated = {
        ...prev,
        [listName]: [...(prev[listName] || []), trimmed],
      };

      // Optional: persist KYC
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

  const handleSaveIGM = () => {
    const existingIGMs = JSON.parse(localStorage.getItem("savedIGMs") || "[]");
    const newRecord = {
      ...igmForm,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "savedIGMs",
      JSON.stringify([...existingIGMs, newRecord])
    );

    alert("IGM details saved successfully!");
  };

  return (
    <div className="min-h-screen p-15">
      <Navbar />

      <div className="max-w-5xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl text-black">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          IGM Details
        </h3>

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
                    value={igmForm.mblNo}
                    onChange={handleChange}
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
                    value={igmForm.eta}
                    onChange={handleChange}
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
                    value={igmForm.etd}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter IGM number"
                  />
                </td>
              </tr>

              {/* CHA / CFS */}
              <tr className="border-b border-gray-300">
                <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                  CHA Name
                </td>
                <td className="w-1/4 border-r border-gray-300 px-4 py-4">
                  <select
                    name="chaName"
                    value={igmForm.chaName}
                    onChange={(e) =>
                      handleSelectKyc("chaName", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                  CFS Name
                </td>
                <td className="w-1/4 px-4 py-4">
                  <select
                    name="cfsName"
                    value={igmForm.cfsName}
                    onChange={(e) =>
                      handleSelectKyc("cfsName", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <tr className="border-b border-gray-300">
                <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                  Freight Amount
                </td>
                <td className="w-1/4 border-r border-gray-300 px-4 py-4">
                  <input
                    type="number"
                    name="freightAmount"
                    value={igmForm.freightAmount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter freight amount"
                  />
                </td>
                <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                  DO Validity
                </td>
                <td className="w-1/4 px-4 py-4">
                  <input
                    type="date"
                    name="doValidity"
                    value={igmForm.doValidity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </td>
              </tr>

              {/* Container Number */}
              <tr className="border-b border-gray-300">
                <td className="w-1/4 border-r border-gray-300 px-4 py-4 font-medium bg-gray-50">
                  Container Number
                </td>
                <td colSpan={3} className="px-4 py-4">
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

          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={handleSaveIGM}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-16 py-3 rounded-lg text-sm transition-colors shadow-lg hover:shadow-xl"
            >
              Save IGM
            </button>
          </div>
        </div>
      </div>

      {/* Add New KYC Modal for CHA/CFS */}
      {showAddNew.type && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={handleCancelNewKyc}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
              <h4 className="text-xl font-bold text-gray-800 mb-6">
                Add New {showAddNew.type === "chaName" ? "CHA" : "CFS"}
              </h4>
              <input
                type="text"
                value={showAddNew.value}
                onChange={(e) =>
                  setShowAddNew((prev) => ({ ...prev, value: e.target.value }))
                }
                placeholder={`Enter ${showAddNew.type === "chaName" ? "CHA" : "CFS"} name`}
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
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default IGMPage;
