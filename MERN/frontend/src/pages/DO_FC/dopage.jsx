import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../NavBar/navbar";

const DoPrintPage = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobNo, setSelectedJobNo] = useState("");
  const [selectedBlType, setSelectedBlType] = useState(""); // "MBL" or "HBL"
  const [previewData, setPreviewData] = useState(null);

  // Load all jobs saved by Booking page
  useEffect(() => {
    const savedJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
    setJobs(savedJobs);
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((j) => String(j.jobNo) === String(selectedJobNo)),
    [jobs, selectedJobNo]
  );

  // Compute BL options for current job
  const blOptions = useMemo(() => {
    if (!selectedJob) return [];
    const latestUpdate =
      selectedJob.updates && selectedJob.updates.length
        ? selectedJob.updates[selectedJob.updates.length - 1]
        : null;

    if (!latestUpdate) return [];

    const opts = [];
    if (latestUpdate.mblNo) {
      opts.push({
        type: "MBL",
        label: `MBL - ${latestUpdate.mblNo}`,
      });
    }
    if (latestUpdate.hblNo) {
      opts.push({
        type: "HBL",
        label: `HBL - ${latestUpdate.hblNo}`,
      });
    }
    return opts;
  }, [selectedJob]);

  const handleSearch = () => {
    if (!selectedJob || !selectedBlType) return;
    const latestUpdate =
      selectedJob.updates && selectedJob.updates.length
        ? selectedJob.updates[selectedJob.updates.length - 1]
        : {};

    // Common values (you can replace hard-coded ones with KYC/master data)
    const companyName = "SSR LOGISTIC SOLUTIONS PVT. LTD.";
    const addressLine1 =
      "Office No. 612, 6th Floor, Vashi Infotech Park, Sector - 30 A, Near Raghuleela Mall, Vashi, Navi Mumbai-400703, Maharashtra, India";
    const email = "customerservice@ssrlogistic.net";
    const phone = "7700990630";
    const doNo = latestUpdate.mblNo || ""; // same as sample DO NO is MBL No.[file:21][file:22]

    const base = {
      companyName,
      addressLine1,
      email,
      phone,
      doNo,
      doDate: "",

      hblNo: latestUpdate.hblNo || "",
      hblDate: latestUpdate.hblDate || "", // if you store it
      mblNo: latestUpdate.mblNo || "",
      mblDate: latestUpdate.mblDate || "",

      containerNos: latestUpdate.containerNumbers || latestUpdate.containerNo || "",
      mblConsignee: latestUpdate.mblConsignee || selectedJob.consignee || "",
      hblConsignee: latestUpdate.hblConsignee || selectedJob.consignee || "",
      notifyParty: latestUpdate.notifyParty || "",
      cha: latestUpdate.chaName || "",
      cargoDescription: latestUpdate.cargoDescription || latestUpdate.cargoType || "",
      delivery: latestUpdate.delivery || "Full",
      noOfPackages: latestUpdate.noOfPackages || "",
      measurement: latestUpdate.measurement || "",
      grossWeight: latestUpdate.grossWeight || "",
      vesselVoyage: latestUpdate.vesselVoyage || latestUpdate.shippingLineName || "",
      igmNo: latestUpdate.igmNo || "",
      lineNo: latestUpdate.lineNo || "",
      subLineNo: latestUpdate.subLineNo || "",
      marksAndNos: latestUpdate.marksAndNumbers || "",
      validity: latestUpdate.doValidity || "",
    };

    let specific;
    if (selectedBlType === "MBL") {
      // Match MBL PDF: To = CFS, Notify Party = SSR, Line No = 252, Marks = MADE IN CHINA in your sample.[file:21]
      specific = {
        toParty: latestUpdate.toPartyMbl || "BUDGET CFS TERMINALS PRIVATE LIMITED",
        notifyParty:
          latestUpdate.notifyPartyMbl ||
          base.notifyParty ||
          "SSR LOGISTIC SOLUTIONS PVT LTD",
        lineNo: latestUpdate.lineNo || "252",
        marksAndNos:
          latestUpdate.marksAndNumbersMbl || base.marksAndNos || "MADE IN CHINA",
      };
    } else {
      // Match HBL PDF: To = Line/Shipping Co, Notify = HBL consignee, Line No = IGM No in sample.[file:22]
      specific = {
        toParty:
          latestUpdate.toPartyHbl ||
          latestUpdate.shippingLineName ||
          "MSC MEDITERRANEAN SHIPPING CO. S.A. (G)",
        notifyParty:
          latestUpdate.notifyPartyHbl ||
          base.hblConsignee ||
          "SHLOKA ENTERPRISES",
        lineNo: latestUpdate.lineNo || base.igmNo || "1139433",
        marksAndNos:
          latestUpdate.marksAndNumbersHbl ||
          base.marksAndNos ||
          "RECARBURIZER LOT NO:202504-01 MADE IN CHINA",
      };
    }

    setPreviewData({ ...base, ...specific, blType: selectedBlType });
  };

  const handleGeneratePdf = () => {
    if (!previewData) return;
    // Plug in your pdf/print logic: jsPDF, print window, or API call
    alert(
      `Generate ${previewData.blType} DO PDF for Job ${selectedJobNo} (${previewData.blType} No: ${
        previewData.blType === "MBL" ? previewData.mblNo : previewData.hblNo
      })`
    );
  };

  return (
    <div className="min-h-screen p-20">
      <Navbar />

      <div className="max-w-6xl mx-auto mt-6 p-6 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">SI DO Print</h2>

        {/* Search controls */}
        <div className="flex flex-wrap items-end gap-4 mb-6 text-gray-800">
          {/* Job No dropdown from savedJobs */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Job No.</label>
            <select
              value={selectedJobNo}
              onChange={(e) => {
                setSelectedJobNo(e.target.value);
                setSelectedBlType("");
                setPreviewData(null);
              }}
              className="px-3 py-2 border rounded w-40"
            >
              <option value="">Select Job</option>
              {jobs.map((job) => (
                <option key={job.jobNo} value={job.jobNo}>
                  {job.jobNo}
                </option>
              ))}
            </select>
          </div>

          {/* MBL / HBL selector for that job */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">
              MBL / HBL No.
            </label>
            <select
              value={selectedBlType}
              onChange={(e) => {
                setSelectedBlType(e.target.value);
                setPreviewData(null);
              }}
              className="px-3 py-2 border rounded w-64"
              disabled={!selectedJob || !blOptions.length}
            >
              <option value="">Select</option>
              {blOptions.map((opt) => (
                <option key={opt.type} value={opt.type}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSearch}
            disabled={!selectedJobNo || !selectedBlType}
            className="bg-blue-600 text-white px-5 py-2 rounded disabled:opacity-60"
          >
            Search
          </button>
        </div>

        {/* DO preview – matches attached PDFs */}
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
                E-mail ID: {previewData.email} | Tel.No :{" "}
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
                <span className="font-semibold">DO NO. </span>
                {previewData.doNo} &nbsp;&nbsp;
                <span className="font-semibold">DO Date: </span>
                {previewData.doDate || ""}
              </p>
            </div>

            <p className="text-sm mb-4">
              You are requested to kindly make delivery of the below
              mentioned container(s), whose details are as follows:
            </p>

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <p>
                <span className="font-semibold">HBL No: </span>
                {previewData.hblNo}
                {previewData.hblDate && (
                  <>
                    &nbsp; Date: {previewData.hblDate}
                  </>
                )}
              </p>
              <p>
                <span className="font-semibold">MBL No: </span>
                {previewData.mblNo}
                {previewData.mblDate && (
                  <>
                    &nbsp; Date: {previewData.mblDate}
                  </>
                )}
              </p>
              <p className="col-span-2">
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
                <span className="font-semibold">Nofity Party: </span>
                {previewData.notifyParty}
              </p>
              <p>
                <span className="font-semibold">CHA: </span>
                {previewData.cha}
              </p>
              <p className="col-span-2">
                <span className="font-semibold">
                  Cargo Description:
                </span>{" "}
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
                <span className="font-semibold">IGM No. : </span>
                {previewData.igmNo}
              </p>
              <p>
                <span className="font-semibold">Line N0.: </span>
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
                {previewData.validity || ""}
              </p>
            </div>

            <p className="text-xs mt-2">
              NOTE: NO MANUAL REVALIDATION OF DATE IS ALLOWED ON THIS
              DELIVERY ORDER, ONLY FRESH DELIVERY ORDER TO BE ACCEPTED.
            </p>

            <div className="mt-8 text-right text-sm">
              <p>Thanking you,</p>
              <p>Yours Faithfully,</p>
              <p className="mt-4 font-semibold">
                FOR SSR LOGISTIC SOLUTIONS Pvt. Ltd.
              </p>
              <p>Authorized Signatory</p>
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={handleGeneratePdf}
                className="bg-green-600 text-white px-6 py-2 rounded"
              >
                Generate {previewData.blType} PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoPrintPage;
