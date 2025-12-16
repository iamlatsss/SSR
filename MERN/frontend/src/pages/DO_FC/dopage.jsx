import React, { useState } from "react";
import Navbar from "../NavBar/navbar";

const mockFetchDoData = async ({ jobNo, blNo, type }) => {
  // Replace with real fetch (API/localStorage lookup)
  // type = "MBL" or "HBL"
  return {
    companyName: "SSR LOGISTIC SOLUTIONS PVT. LTD.",
    addressLine1:
      "Office No. 612, 6th Floor, Vashi Infotech Park, Sector - 30 A, Near Raghuleela Mall, Vashi, Navi Mumbai-400703, Maharashtra, India",
    email: "customerservice@ssrlogistic.net",
    phone: "7700990630",
    doNo: "MEDUVX583028",
    doDate: "",
    toParty:
      type === "MBL"
        ? "BUDGET CFS TERMINALS PRIVATE LIMITED"
        : "MSC MEDITERRANEAN SHIPPING CO. S.A. (G)",
    hblNo: "UB25042205",
    hblDate: "04-05-2025",
    mblNo: "MEDUVX583028",
    mblDate: "04-05-2025",
    containerNos:
      "MSDU2056272, FCIU4251508, FCIU4159731, MEDU5760919",
    mblConsignee: "SSR LOGISTIC SOLUTIONS PVT LTD",
    hblConsignee: "SHLOKA ENTERPRISES",
    notifyParty:
      type === "MBL"
        ? "SSR LOGISTIC SOLUTIONS PVT LTD"
        : "SHLOKA ENTERPRISES",
    cha: "ADITYA SHIPPING",
    cargoDescription: "CARBON RAISER HS CODE 38249900",
    delivery: "Full",
    noOfPackages: "4320 BAGS",
    measurement: "100.000",
    grossWeight: "108216.000",
    vesselVoyage: "MSC PALOMA V.FY518A",
    igmNo: "1139433",
    lineNo: type === "MBL" ? "252" : "1139433",
    subLineNo: "1",
    marksAndNos: type === "MBL"
      ? "MADE IN CHINA"
      : "RECARBURIZER LOT NO:202504-01 MADE IN CHINA",
    validity: "",
  };
};

const DoCreationPage = () => {
  const [jobNo, setJobNo] = useState("");
  const [selectedBl, setSelectedBl] = useState("");
  const [blType, setBlType] = useState("MBL"); // MBL or HBL
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!jobNo || !selectedBl) return;
    setLoading(true);
    const data = await mockFetchDoData({
      jobNo,
      blNo: selectedBl,
      type: blType,
    });
    setPreviewData(data);
    setLoading(false);
  };

  const handleCreateDo = () => {
    if (!previewData) return;
    // Here call backend / open new tab with actual PDF
    alert("DO created/printed (wire this to backend).");
  };

  return (
    <div className="min-h-screen p-15">
      <Navbar />

      <div className="max-w-6xl mx-auto mt-6 p-6 bg-white rounded-lg shadow">
        <h3 className="text-3xl font-bold text-gray-800 mb-2">SI DO Print</h3>

        {/* Search row */}
        <div className="flex flex-wrap items-end gap-4 mb-6 text-gray-800">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              MBL Job No.
            </label>
            <input
              type="text"
              value={jobNo}
              onChange={(e) => setJobNo(e.target.value)}
              className="px-3 py-2 border rounded w-40"
              placeholder="5182"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              MBL / HBL No.
            </label>
            <select
              value={selectedBl}
              onChange={(e) => setSelectedBl(e.target.value)}
              className="px-3 py-2 border rounded w-64"
            >
              <option value="">Select</option>
              {/* Populate from job data: first option MBL, others HBLs */}
              <option value="5182-MBL">5182-MBL</option>
              <option value="UB25042205-HBL">UB25042205-HBL</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="blType"
                value="MBL"
                checked={blType === "MBL"}
                onChange={() => setBlType("MBL")}
              />
              <span>MBL</span>
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="blType"
                value="HBL"
                checked={blType === "HBL"}
                onChange={() => setBlType("HBL")}
              />
              <span>HBL</span>
            </label>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !jobNo || !selectedBl}
            className="bg-blue-600 text-white px-5 py-2 rounded disabled:opacity-60"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>

        {/* Preview */}
        {previewData && (
          <div className="border border-gray-300 p-6 rounded-md bg-gray-50">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold">
                {previewData.companyName}
              </h3>
              <p className="text-xs mt-1">
                {previewData.addressLine1}
              </p>
              <p className="text-xs mt-1">
                E-mail: {previewData.email} | Tel:{" "}
                {previewData.phone}
              </p>
              <h4 className="mt-4 text-base font-semibold">
                DELIVERY ORDER
              </h4>
            </div>

            <div className="text-sm mb-4">
              <p>
                <span className="font-semibold">To, </span>
                {previewData.toParty}
              </p>
              <p className="mt-2">
                <span className="font-semibold">DO No.: </span>
                {previewData.doNo} &nbsp;&nbsp;
                <span className="font-semibold">DO Date: </span>
                {previewData.doDate || "—"}
              </p>
            </div>

            <p className="text-sm mb-4">
              You are requested to kindly make delivery of the below
              mentioned container(s), whose details are as follows:
            </p>

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <p>
                <span className="font-semibold">HBL No.: </span>
                {previewData.hblNo} &nbsp; Date:{" "}
                {previewData.hblDate}
              </p>
              <p>
                <span className="font-semibold">MBL No.: </span>
                {previewData.mblNo} &nbsp; Date:{" "}
                {previewData.mblDate}
              </p>
              <p>
                <span className="font-semibold">Container No.: </span>
                {previewData.containerNos}
              </p>
              <p>
                <span className="font-semibold">MBL Consignee: </span>
                {previewData.mblConsignee}
              </p>
              <p>
                <span className="font-semibold">HBL Consignee: </span>
                {previewData.hblConsignee}
              </p>
              <p>
                <span className="font-semibold">Notify Party: </span>
                {previewData.notifyParty}
              </p>
              <p>
                <span className="font-semibold">CHA: </span>
                {previewData.cha}
              </p>
              <p>
                <span className="font-semibold">Cargo Description: </span>
                {previewData.cargoDescription}
              </p>
              <p>
                <span className="font-semibold">Delivery: </span>
                {previewData.delivery}
              </p>
              <p>
                <span className="font-semibold">No of Packages: </span>
                {previewData.noOfPackages}
              </p>
              <p>
                <span className="font-semibold">Measurement: </span>
                {previewData.measurement}
              </p>
              <p>
                <span className="font-semibold">Gross Weight: </span>
                {previewData.grossWeight}
              </p>
              <p>
                <span className="font-semibold">Vessel Voyage: </span>
                {previewData.vesselVoyage}
              </p>
              <p>
                <span className="font-semibold">IGM No.: </span>
                {previewData.igmNo}
              </p>
              <p>
                <span className="font-semibold">Line No.: </span>
                {previewData.lineNo}
              </p>
              <p>
                <span className="font-semibold">Sub-Line No.: </span>
                {previewData.subLineNo}
              </p>
              <p className="col-span-2">
                <span className="font-semibold">Marks & Nos.: </span>
                {previewData.marksAndNos}
              </p>
              <p className="col-span-2">
                <span className="font-semibold">
                  This Delivery Order is Valid Till:
                </span>{" "}
                {previewData.validity || "—"}
              </p>
            </div>

            <p className="text-xs mt-2">
              NOTE: NO MANUAL REVALIDATION OF DATE IS ALLOWED ON THIS
              DELIVERY ORDER, ONLY FRESH DELIVERY ORDER TO BE ACCEPTED.
            </p>

            <div className="mt-8 text-right text-sm">
              <p>Thanking you,</p>
              <p>Yours faithfully,</p>
              <p className="mt-4 font-semibold">
                FOR SSR LOGISTIC SOLUTIONS PVT. LTD.
              </p>
              <p>Authorized Signatory</p>
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={handleCreateDo}
                className="bg-green-600 text-white px-6 py-2 rounded"
              >
                Create / Print DO
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoCreationPage;
