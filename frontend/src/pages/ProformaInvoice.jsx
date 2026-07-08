import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import {
  FileText, Search, Printer, Download, Eye, AlertCircle, CheckCircle, RefreshCw, X
} from "lucide-react";
import { toast } from "react-toastify";
import SearchableDropdown from "../components/SearchableDropdown";

// Helper to convert numbers to Indian Rupee Words in frontend
function numberToWordsINR(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function numToWords(n) {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit !== 0 ? ' ' + a[digit] : '');
    }

    let n = Math.floor(num);
    const paise = Math.round((num - n) * 100);
    let str = '';

    if (n === 0) return 'Zero Rupees';

    const crores = Math.floor(n / 10000000);
    n %= 10000000;
    if (crores > 0) {
        str += numToWords(crores) + ' Crore ';
    }

    const lakhs = Math.floor(n / 100000);
    n %= 100000;
    if (lakhs > 0) {
        str += numToWords(lakhs) + ' Lakh ';
    }

    const thousands = Math.floor(n / 1000);
    n %= 1000;
    if (thousands > 0) {
        str += numToWords(thousands) + ' Thousand ';
    }

    const hundreds = Math.floor(n / 100);
    n %= 100;
    if (hundreds > 0) {
        str += numToWords(hundreds) + ' Hundred ';
    }

    if (n > 0) {
        if (str !== '') str += 'And ';
        str += numToWords(n) + ' ';
    }

    str += 'Rupees';

    if (paise > 0) {
        str += ' And ' + numToWords(paise) + ' Paise';
    }

    return str + ' Only';
}

// Helper to convert numbers to USD Words in frontend
function numberToWordsUSD(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function numToWords(n) {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit !== 0 ? ' ' + a[digit] : '');
    }

    let n = Math.floor(num);
    const cents = Math.round((num - n) * 100);
    let str = '';

    if (n === 0) return 'Zero US Dollars';

    const millions = Math.floor(n / 1000000);
    n %= 1000000;
    if (millions > 0) {
        str += numToWords(millions) + ' Million ';
    }

    const thousands = Math.floor(n / 1000);
    n %= 1000;
    if (thousands > 0) {
        str += numToWords(thousands) + ' Thousand ';
    }

    const hundreds = Math.floor(n / 100);
    n %= 100;
    if (hundreds > 0) {
        str += numToWords(hundreds) + ' Hundred ';
    }

    if (n > 0) {
        if (str !== '') str += 'And ';
        str += numToWords(n) + ' ';
    }

    str += 'US Dollars';

    if (cents > 0) {
        str += ' And ' + numToWords(cents) + ' Cents';
    }

    return str + ' Only';
}

export default function ProformaInvoice() {
  // Master Lists
  const [mblJobs, setMblJobs] = useState([]);
  const [hblJobs, setHblJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Filters State
  const [selectedMblJobNo, setSelectedMblJobNo] = useState("");
  const [mblHblDropdownList, setMblHblDropdownList] = useState([]);
  const [selectedMblHbl, setSelectedMblHbl] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [printType, setPrintType] = useState("Invoice"); // 'Invoice' (INR) or 'USD'
  const [proformaDate, setProformaDate] = useState(new Date().toISOString().split("T")[0]);

  // Dynamic filter state
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);

  // Memoized options for SearchableDropdowns
  const jobOptions = useMemo(() => {
    return mblJobs.map(j => ({
      value: j.job_no,
      label: `Job #${j.job_no} (${j.mbl_no || "No MBL"})`
    }));
  }, [mblJobs]);

  const mblHblOptions = useMemo(() => {
    return mblHblDropdownList.map(opt => ({
      value: JSON.stringify(opt),
      label: opt.label
    }));
  }, [mblHblDropdownList]);

  const clientOptions = useMemo(() => {
    return filteredCustomers.map(c => ({
      value: c.customer_id,
      label: `${c.name} ${c.gstin ? `(${c.gstin})` : ''}`
    }));
  }, [filteredCustomers]);

  // Charges spreadsheet state
  const [allCharges, setAllCharges] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [jobExchangeRate, setJobExchangeRate] = useState(85.00);

  // Totals calculations
  const [calcTotals, setCalcTotals] = useState({
    subtotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    grandTotal: 0
  });

  // Modal State
  const [previewPdfUrl, setPreviewPdfUrl] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeTab, setActiveTab] = useState("generate"); // "generate" or "stored"

  useEffect(() => {
    loadInitData();
    loadHistory();
  }, []);

  // Recalculate related MBL/HBL options when job number changes
  useEffect(() => {
    if (!selectedMblJobNo) {
      setMblHblDropdownList([]);
      setSelectedMblHbl("");
      setCurrentJob(null);
      return;
    }

    fetchJobDetails(selectedMblJobNo);
  }, [selectedMblJobNo]);

  // Trigger real-time calculation whenever selected charges, client, print type, or ex-rate changes
  useEffect(() => {
    calculateGridTotals();
  }, [checkedItems, allCharges, selectedClient, printType, jobExchangeRate]);

  const loadInitData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/proforma/init");
      if (res.data.success) {
        setMblJobs(res.data.mblJobs || []);
        setHblJobs(res.data.hblJobs || []);
        setCustomers(res.data.customers || []);
      }
    } catch (error) {
      console.error("Error loading proforma init data:", error);
      toast.error("Failed to load setup directories.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get("/proforma/history");
      if (res.data.success) {
        setHistory(res.data.invoices || []);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const fetchJobDetails = async (jobNo) => {
    try {
      const res = await api.get(`/proforma/job-details/${jobNo}`);
      if (res.data.success) {
        const job = res.data.job;
        setCurrentJob(job);
        const options = [];

        // 1. Add MBL option
        if (job.mbl_no) {
          options.push({ label: `MBL: ${job.mbl_no}`, type: "MBL", number: job.mbl_no });
        }

        // 2. Add HBL options (if related or loaded polymorphically)
        if (res.data.relatedHBLs && res.data.relatedHBLs.length > 0) {
          res.data.relatedHBLs.forEach(h => {
            options.push({ label: `HBL: ${h.hbl_no}`, type: "HBL", number: h.hbl_no });
          });
        }

        setMblHblDropdownList(options);
        if (options.length > 0) {
          setSelectedMblHbl(JSON.stringify(options[0]));
        }

        // Auto-select client based on job details FK
        if (job.shipper && customers.some(c => c.customer_id === job.shipper)) {
          setSelectedClient(job.shipper);
        } else if (job.consignee && customers.some(c => c.customer_id === job.consignee)) {
          setSelectedClient(job.consignee);
        }
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
      toast.error("Failed to load BL details for Job #" + jobNo);
    }
  };

  // Fetch sell rates silently in the background to filter Client/Vendor
  useEffect(() => {
    const fetchRatesSilently = async () => {
      if (!selectedMblJobNo || !selectedMblHbl) {
        setFilteredCustomers([]);
        setSelectedClient("");
        return;
      }
      try {
        const chosenBL = JSON.parse(selectedMblHbl);
        const res = await api.get("/proforma/search-charges", {
          params: {
            job_no: selectedMblJobNo,
            mbl_hbl_type: chosenBL.type,
            mbl_hbl_no: chosenBL.number
          }
        });
        if (res.data.success) {
          const sellRates = res.data.sellRates || [];
          const uniqueParties = [...new Set(sellRates.map(r => r.party).filter(Boolean))];
          
          const matched = [];
          const customParties = [];
          
          uniqueParties.forEach(p => {
            const found = customers.find(c => String(c.customer_id) === String(p));
            if (found) {
              matched.push(found);
            } else {
              const foundByName = customers.find(c => c.name.toLowerCase().trim() === String(p).toLowerCase().trim());
              if (foundByName) {
                matched.push(foundByName);
              } else {
                // Wrap custom string party
                customParties.push({
                  customer_id: p,
                  name: p,
                  address: "",
                  gstin: "",
                  customer_type: "Custom"
                });
              }
            }
          });
          
          const combined = [...matched, ...customParties];
          const seen = new Set();
          const finalCustomers = combined.filter(c => {
            const key = String(c.customer_id);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          
          setFilteredCustomers(finalCustomers);
          
          // Pre-select based on Sell Rate active parties
          let preferredClient = "";
          if (currentJob) {
            const shipperMatch = finalCustomers.find(c => String(c.customer_id) === String(currentJob.shipper));
            const consigneeMatch = finalCustomers.find(c => String(c.customer_id) === String(currentJob.consignee));
            if (shipperMatch) {
              preferredClient = shipperMatch.customer_id;
            } else if (consigneeMatch) {
              preferredClient = consigneeMatch.customer_id;
            }
          }
          
          if (preferredClient) {
            setSelectedClient(preferredClient);
          } else if (finalCustomers.length === 1) {
            setSelectedClient(finalCustomers[0].customer_id);
          } else {
            // Keep if current is valid, else empty
            const currentIsValid = finalCustomers.some(c => String(c.customer_id) === String(selectedClient));
            if (!currentIsValid) {
              setSelectedClient("");
            }
          }
        }
      } catch (error) {
        console.error("Error silently fetching charges for client filter:", error);
      }
    };
    
    fetchRatesSilently();
  }, [selectedMblJobNo, selectedMblHbl, customers, currentJob]);

  const handleSearchCharges = async () => {
    if (!selectedMblJobNo) {
      toast.warning("Please select a MBL Job No");
      return;
    }
    if (!selectedMblHbl) {
      toast.warning("Please select an MBL / HBL Number");
      return;
    }

    try {
      setSearchTriggered(true);
      const chosenBL = JSON.parse(selectedMblHbl);
      
      const res = await api.get("/proforma/search-charges", {
        params: {
          job_no: selectedMblJobNo,
          mbl_hbl_type: chosenBL.type,
          mbl_hbl_no: chosenBL.number
        }
      });

      if (res.data.success) {
        const sellRates = res.data.sellRates || [];
        setAllCharges(sellRates);

        // Retrieve job exchange rate if available
        const firstRateWithEx = sellRates.find(r => r.ex_rate && parseFloat(r.ex_rate) > 1);
        if (firstRateWithEx) {
          setJobExchangeRate(parseFloat(firstRateWithEx.ex_rate));
        }

        // Check/Select all items by default
        const checks = {};
        sellRates.forEach((item, index) => {
          checks[index] = true;
        });
        setCheckedItems(checks);

        toast.success(`Loaded ${sellRates.length} Sell Rate charge rows.`);
      }
    } catch (error) {
      console.error("Error looking up sell rates:", error);
      toast.error("Failed to fetch sell rates: " + error.message);
    }
  };

  const getClientDetails = () => {
    if (!selectedClient) return null;
    return filteredCustomers.find(c => c.customer_id == selectedClient) || customers.find(c => c.customer_id == selectedClient) || null;
  };

  const calculateGridTotals = () => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const client = getClientDetails();
    const isMaharashtra = client && (String(client.gstin || '').startsWith('27') || String(client.address || '').toLowerCase().includes('maharashtra'));

    allCharges.forEach((item, index) => {
      if (!checkedItems[index]) return;

      const qty = parseFloat(item.quantity || 1);
      const rate = parseFloat(item.rate || 0);
      const itemCurrency = item.currency || 'USD';
      const rowExRate = parseFloat(item.ex_rate || jobExchangeRate || 85.00);

      let baseAmount = qty * rate; // in native currency

      if (printType === 'USD') {
        // We sum everything in USD values
        let amountUSD = baseAmount;
        if (itemCurrency === 'INR') {
          amountUSD = baseAmount / rowExRate;
        }

        subtotal += amountUSD;

        const gstRate = parseFloat(item.gst || 0);
        const taxValUSD = amountUSD * (gstRate / 100);

        if (gstRate > 0) {
          if (isMaharashtra) {
            cgst += taxValUSD / 2;
            sgst += taxValUSD / 2;
          } else {
            igst += taxValUSD;
          }
        }
      } else {
        // INR LOCAL
        let amountINR = baseAmount;
        if (itemCurrency === 'USD') {
          amountINR = baseAmount * rowExRate;
        }

        subtotal += amountINR;

        const gstRate = parseFloat(item.gst || 0);
        const taxValINR = amountINR * (gstRate / 100);

        if (gstRate > 0) {
          if (isMaharashtra) {
            cgst += taxValINR / 2;
            sgst += taxValINR / 2;
          } else {
            igst += taxValINR;
          }
        }
      }
    });

    const grandTotal = subtotal + cgst + sgst + igst;
    setTotalsState({ subtotal, cgst, sgst, igst, grandTotal });
  };

  const setTotalsState = (t) => {
    setCalcTotals(t);
  };

  const handleCheckboxChange = (index) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSelectAll = (checked) => {
    const checks = {};
    allCharges.forEach((_, idx) => {
      checks[idx] = checked;
    });
    setCheckedItems(checks);
  };

  const handleProcessProforma = async () => {
    const client = getClientDetails();
    if (!client) {
      toast.error("Please select a valid Client / Vendor!");
      return;
    }

    const selectedItems = allCharges.filter((_, idx) => checkedItems[idx]);
    if (selectedItems.length === 0) {
      toast.error("Please tick/select at least one charge item!");
      return;
    }

    try {
      setProcessing(true);
      const chosenBL = JSON.parse(selectedMblHbl);

      const payload = {
        jobNo: selectedMblJobNo,
        mblHblType: chosenBL.type,
        mblHblNo: chosenBL.number,
        clientId: client.customer_id,
        clientName: client.name,
        clientAddress: client.address || '',
        clientGstin: client.gstin || '',
        clientState: client.gstin ? client.gstin.slice(0,2) : '',
        printType,
        proformaDate,
        items: selectedItems,
        totals: calcTotals,
        exRate: jobExchangeRate
      };

      const res = await api.post("/proforma/save", payload);

      if (res.data.success) {
        toast.success(`Successfully saved Proforma #${res.data.proformaNo}`);
        setPreviewPdfUrl(res.data.pdfUrl);
        setShowPreviewModal(true);
        loadHistory(); // reload logs
      } else {
        toast.error("Generation failed: " + res.data.message);
      }
    } catch (error) {
      console.error("Error generating proforma:", error);
      toast.error("API error while generating Proforma PDF: " + (error.response?.data?.message || error.message));
    } finally {
      setProcessing(false);
    }
  };

  const openPastPreview = (pdfUrl) => {
    setPreviewPdfUrl(pdfUrl);
    setShowPreviewModal(true);
  };

  const handleDeleteProforma = async (id, proformaNo) => {
    if (!window.confirm(`Are you sure you want to delete Proforma Invoice #${proformaNo}? This will delete the proforma from the database and reset the job status.`)) {
      return;
    }
    try {
      const res = await api.delete(`/proforma/delete/${id}`);
      if (res.data.success) {
        toast.success(res.data.message || `Proforma Invoice #${proformaNo} has been deleted.`);
        loadHistory(); // Reload history
      } else {
        toast.error("Deletion failed: " + res.data.message);
      }
    } catch (error) {
      console.error("Error deleting proforma invoice:", error);
      toast.error("Failed to delete proforma invoice: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <DashboardLayout title="Proforma Invoice Generator">
      <div className="space-y-8 w-full p-1 font-poppins">
        
        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 mb-6">
          <button
            onClick={() => setActiveTab("generate")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "generate"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Generate Proforma
          </button>
          <button
            onClick={() => setActiveTab("stored")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "stored"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Stored Proformas
          </button>
        </div>

        {activeTab === "generate" ? (
          <>
            {/* TOP FILTER CONTROLS */}
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-md p-6 rounded-2xl transition-all duration-300">
          <h3 className="text-md font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileText size={20} className="text-indigo-500" /> Filter Billing Context
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. MBL Job Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Select MBL Job No</label>
              <SearchableDropdown
                options={jobOptions}
                value={selectedMblJobNo}
                onChange={(val) => setSelectedMblJobNo(val)}
                placeholder="Select Job Reference"
              />
            </div>

            {/* 2. MBL / HBL Number Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">MBL / HBL No Dropdown</label>
              <SearchableDropdown
                options={mblHblOptions}
                value={selectedMblHbl}
                onChange={(val) => setSelectedMblHbl(val)}
                disabled={mblHblDropdownList.length === 0}
                placeholder={mblHblDropdownList.length === 0 ? "Choose Job first" : "Select MBL / HBL Number"}
              />
            </div>

            {/* 3. Client / Vendor Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Client / Vendor Dropdown</label>
              <SearchableDropdown
                options={clientOptions}
                value={selectedClient}
                onChange={(val) => setSelectedClient(val)}
                placeholder="Select Client for Invoice"
                noOptionsText="No clients in Sell Rates for this Job"
              />
            </div>

            {/* 4. Print Type & Ex-Rate */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invoice Print Type</label>
              <div className="flex gap-4 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl items-center h-[42px]">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="print_type"
                    checked={printType === "Invoice"}
                    onChange={() => setPrintType("Invoice")}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  INR Local
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="print_type"
                    checked={printType === "USD"}
                    onChange={() => setPrintType("USD")}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  USD FX
                </label>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
            {/* Ex-Rate setting */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">USD Exchange Rate (Ex Rate)</label>
              <input
                type="number"
                step="0.01"
                value={jobExchangeRate}
                onChange={(e) => setJobExchangeRate(parseFloat(e.target.value) || 85.00)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="85.00"
              />
            </div>

            {/* Proforma Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Proforma Date</label>
              <input
                type="date"
                value={proformaDate}
                onChange={(e) => setProformaDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={handleSearchCharges}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 h-[44px]"
              >
                <Search size={16} /> Search Charges
              </button>

              <button
                type="button"
                onClick={handleProcessProforma}
                disabled={processing || allCharges.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 h-[44px] disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Printer size={16} /> Process Proforma Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* INTERACTIVE CHARGES GRID */}
        {searchTriggered && (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-md p-6 rounded-2xl transition-all duration-300">
            <h3 className="text-md font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
              <span>Selectable Charges Spreadsheet Grid</span>
              <span className="text-xs normal-case font-normal text-slate-500">
                GST rules split CGST/SGST based on Client supply location.
              </span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-xl">
              <table className="w-full text-left border-collapse table-fixed text-xs min-w-[1150px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 text-center w-[40px]">
                      <input
                        type="checkbox"
                        checked={allCharges.length > 0 && allCharges.every((_, idx) => checkedItems[idx])}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5 w-[180px]">Party (Client/Vendor)</th>
                    <th className="p-3.5 w-[240px]">Charge Name</th>
                    <th className="p-3.5 w-[90px] text-center">HSN/SAC</th>
                    <th className="p-3.5 text-center w-[70px]">GST Rate</th>
                    <th className="p-3.5 w-[100px]">Unit</th>
                    <th className="p-3.5 text-center w-[50px]">Qty</th>
                    <th className="p-3.5 text-right w-[80px]">Base Rate</th>
                    <th className="p-3.5 text-center w-[60px]">Curr</th>
                    <th className="p-3.5 text-right w-[70px]">Ex Rate</th>
                    <th className="p-3.5 text-right w-[90px]">Amount (FC)</th>
                    <th className="p-3.5 text-right w-[95px]">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {allCharges.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="p-8 text-center text-slate-500 italic">
                        No Sell Rates found for this BL number.
                      </td>
                    </tr>
                  ) : (
                    allCharges.map((row, idx) => {
                      const qty = parseFloat(row.quantity || 1);
                      const baseRate = parseFloat(row.rate || 0);
                      const fcAmt = qty * baseRate;
                      const ex = parseFloat(row.ex_rate || jobExchangeRate || 85.00);
                      const isUSD = (row.currency || 'USD') === 'USD';
                      const inrAmt = isUSD ? fcAmt * ex : fcAmt;

                      const partyName = filteredCustomers.find(c => c.customer_id == row.party)?.name || customers.find(c => c.customer_id == row.party)?.name || row.party || '—';

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all ${
                            checkedItems[idx] ? "bg-indigo-50/10 dark:bg-indigo-900/5" : "opacity-60"
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={!!checkedItems[idx]}
                              onChange={() => handleCheckboxChange(idx)}
                              className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                            <span className="block truncate" title={partyName}>{partyName}</span>
                          </td>
                          <td className="p-3 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                            <span className="block truncate" title={row.charge}>{row.charge}</span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-500">
                            {row.sac || row.hsn_sac || "—"}
                          </td>
                          <td className="p-3 text-center font-bold text-teal-600 dark:text-teal-400">
                            {row.gst || '0%'}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {row.unit}
                          </td>
                          <td className="p-3 text-center font-semibold">{qty}</td>
                          <td className="p-3 text-right font-medium">{baseRate.toFixed(2)}</td>
                          <td className="p-3 text-center font-bold text-slate-500">{row.currency}</td>
                          <td className="p-3 text-right text-slate-500">{ex.toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                            {fcAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {inrAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* REAL-TIME MATHEMATICS MATH BOARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              
              {/* Grand Total Words */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 flex flex-col justify-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Amount In Words ({printType === 'USD' ? 'USD' : 'INR'})
                </span>
                <p className="text-md font-bold text-indigo-600 dark:text-indigo-400 leading-snug">
                  {printType === 'USD' 
                    ? numberToWordsUSD(calcTotals.grandTotal) 
                    : numberToWordsINR(calcTotals.grandTotal)}
                </p>
              </div>

              {/* Totals split values */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 space-y-3 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Subtotal:</span>
                  <span className="font-bold">
                    {printType === 'USD' 
                      ? `$ ${calcTotals.subtotal.toFixed(2)}` 
                      : `₹ ${calcTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
                {calcTotals.igst > 0 && (
                  <div className="flex justify-between text-teal-600 dark:text-teal-400">
                    <span>IGST Component:</span>
                    <span className="font-bold">
                      {printType === 'USD' 
                        ? `$ ${calcTotals.igst.toFixed(2)}` 
                        : `₹ ${calcTotals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                )}
                {calcTotals.cgst > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>CGST Component (Half split):</span>
                    <span className="font-bold">
                      {printType === 'USD' 
                        ? `$ ${calcTotals.cgst.toFixed(2)}` 
                        : `₹ ${calcTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                )}
                {calcTotals.sgst > 0 && (
                  <div className="flex justify-between text-amber-600 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span>SGST Component (Half split):</span>
                    <span className="font-bold">
                      {printType === 'USD' 
                        ? `$ ${calcTotals.sgst.toFixed(2)}` 
                        : `₹ ${calcTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-md font-bold text-slate-800 dark:text-white pt-1">
                  <span>Grand Total:</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-lg">
                    {printType === 'USD' 
                      ? `$ ${calcTotals.grandTotal.toFixed(2)}` 
                      : `₹ ${calcTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              </div>

            </div>

          </div>
        )}
          </>
        ) : (
          /* PROFORMA INVOICES ARCHIVE HISTORY */
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-md p-6 rounded-2xl transition-all duration-300">
          <h3 className="text-md font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileText size={20} className="text-indigo-500" /> Proforma Invoices History Log
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                  <th className="p-4">Proforma No</th>
                  <th className="p-4">Job No</th>
                  <th className="p-4">BL Type</th>
                  <th className="p-4">BL Number</th>
                  <th className="p-4">Billing Client</th>
                  <th className="p-4 text-center">Print Currency</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500 italic">
                      No proforma invoices generated yet.
                    </td>
                  </tr>
                ) : (
                  history.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">#{inv.proforma_no || inv.id}</td>
                      <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">#{inv.job_no}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          inv.mbl_hbl_type === 'MBL' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {inv.mbl_hbl_type}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-medium">{inv.mbl_hbl_no}</td>
                      <td className="p-4 font-semibold">{inv.client_name}</td>
                      <td className="p-4 text-center font-bold text-teal-600">{inv.print_type === 'USD' ? 'USD' : 'INR'}</td>
                      <td className="p-4">{new Date(inv.proforma_date || inv.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right flex justify-end gap-3">
                        <button
                          onClick={() => openPastPreview(inv.pdf_link)}
                          title="Interactive Preview"
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 dark:text-indigo-400 rounded-lg transition-colors inline-flex items-center justify-center"
                          disabled={!inv.pdf_link}
                        >
                          <Eye size={16} />
                        </button>
                        <a
                          href={inv.pdf_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="S3 Download"
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/30 dark:text-emerald-400 rounded-lg transition-colors inline-flex items-center justify-center"
                          disabled={!inv.pdf_link}
                        >
                          <Download size={16} />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

      </div>

      {/* POPUP MODAL FOR INTERACTIVE PREVIEW */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="relative bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-500" />
                <h3 className="text-md font-bold text-slate-800 dark:text-white font-poppins">
                  Interactive Proforma Invoice PDF Preview
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body iframe */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-900 p-2">
              {previewPdfUrl ? (
                <iframe
                  src={previewPdfUrl}
                  title="PDF Preview"
                  className="w-full h-full border-0 rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <AlertCircle size={40} className="text-amber-500 mb-2 animate-bounce" />
                  No PDF Preview file URL located.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <a
                href={previewPdfUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              >
                <Download size={16} /> Open in S3 / Download
              </a>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
