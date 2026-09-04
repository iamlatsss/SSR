import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import {
  FileText, Search, Printer, Download, Eye, AlertCircle, CheckCircle, RefreshCw, X,
  ChevronDown, ChevronUp, ChevronRight, Folder, Layers, Trash2, Building2
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

export default function Invoice() {
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
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);

  // Dynamic filter state
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);

  // Stored Invoice Search State
  const [searchVal, setSearchVal] = useState("");
  const [historySearchTerm, setHistorySearchTerm] = useState("");

  // Memoized options for SearchableDropdowns
  const jobOptions = useMemo(() => {
    return mblJobs.map(j => ({
      value: j.job_no,
      label: `Job #${j.job_no}`,
      mbl_no: j.mbl_no || "",
      hbl_no: j.hbl_no || "",
      shipper_name: j.shipper_name || "",
      consignee_name: j.consignee_name || ""
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
  const [exchangeRateInput, setExchangeRateInput] = useState("85.00");

  useEffect(() => {
    setExchangeRateInput(String(jobExchangeRate));
  }, [jobExchangeRate]);

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

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editActiveTab, setEditActiveTab] = useState("main"); // "main" or "detail"
  const [editItems, setEditItems] = useState([]);
  const [editTotals, setEditTotals] = useState({ subtotal: 0, cgst: 0, sgst: 0, igst: 0, grandTotal: 0 });
  const [editInvoiceDate, setEditInvoiceDate] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editExRate, setEditExRate] = useState(85.00);
  const [savingEdit, setSavingEdit] = useState(false);

  const calculateEditTotals = (items, printType, clientGstin, clientAddress) => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const isMaharashtra = clientGstin 
      ? String(clientGstin).startsWith('27') 
      : String(clientAddress || '').toLowerCase().includes('maharashtra');

    const firstItem = items[0] || {};
    const effectiveExRate = parseFloat(firstItem.ex_rate || firstItem.exRate || 85.00);

    items.forEach((item) => {
      const qty = parseFloat(item.quantity || item.qty || 1);
      const rate = parseFloat(item.rate || 0);
      const itemCurrency = item.currency || 'USD';
      const rowExRate = parseFloat(item.ex_rate || item.exRate || effectiveExRate);

      let baseAmount = qty * rate;

      if (printType === 'USD') {
        let amountUSD = baseAmount;
        if (itemCurrency === 'INR') {
          amountUSD = baseAmount / rowExRate;
        }
        subtotal += amountUSD;

        const gstRate = parseFloat(item.gst || item.taxPercent || 0);
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
        let amountINR = baseAmount;
        if (itemCurrency === 'USD') {
          amountINR = baseAmount * rowExRate;
        }
        subtotal += amountINR;

        const gstRate = parseFloat(item.gst || item.taxPercent || 0);
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
    return { subtotal, cgst, sgst, igst, grandTotal };
  };

  const handleEditExRateChange = (newRate) => {
    setEditExRate(newRate);
    const updatedItems = editItems.map(item => ({
      ...item,
      ex_rate: newRate,
      exRate: newRate
    }));
    setEditItems(updatedItems);
    const newTotals = calculateEditTotals(
      updatedItems,
      editingInvoice.print_type,
      editingInvoice.client_gstin,
      editingInvoice.client_address
    );
    setEditTotals(newTotals);
  };

  const openEditModal = (inv) => {
    setEditingInvoice(inv);
    let items = [];
    try {
      items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
    } catch (e) {
      items = [];
    }
    setEditItems(items);
    
    let totals = { subtotal: 0, cgst: 0, sgst: 0, igst: 0, grandTotal: 0 };
    try {
      totals = typeof inv.totals === 'string' ? JSON.parse(inv.totals) : (inv.totals || totals);
    } catch(e) {}
    setEditTotals(totals);

    setEditInvoiceDate(inv.invoice_date ? inv.invoice_date.split('T')[0] : "");
    
    const firstItem = items[0] || {};
    const rateVal = parseFloat(firstItem.ex_rate || firstItem.exRate || inv.ex_rate || 85.00);
    setEditExRate(rateVal);
    
    let remarks = "NIL";
    try {
      const parsedTotals = typeof inv.totals === 'string' ? JSON.parse(inv.totals) : (inv.totals || {});
      remarks = parsedTotals.narration || "NIL";
    } catch (e) {}
    setEditRemarks(remarks);

    setEditActiveTab("main");
    setShowEditModal(true);
  };

  const handleDeleteEditItem = (index) => {
    const updated = editItems.filter((_, idx) => idx !== index);
    setEditItems(updated);
    
    const newTotals = calculateEditTotals(
      updated,
      editingInvoice.print_type,
      editingInvoice.client_gstin,
      editingInvoice.client_address
    );
    setEditTotals(newTotals);
  };

  const handleSaveEdit = async () => {
    if (editItems.length === 0) {
      toast.error("Invoice must have at least one charge item!");
      return;
    }
    try {
      setSavingEdit(true);
      const payload = {
        items: editItems,
        totals: {
          ...editTotals,
          narration: editRemarks
        },
        invoiceDate: editInvoiceDate,
        remarks: editRemarks,
        exRate: editExRate
      };

      const res = await api.put(`/invoice/update/${editingInvoice.id}`, payload);
      if (res.data.success) {
        toast.success("Tax Invoice updated successfully!");
        setShowEditModal(false);
        loadHistory();
      } else {
        toast.error("Failed to update invoice: " + res.data.message);
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Error: " + (error.response?.data?.message || error.message));
    } finally {
      setSavingEdit(false);
    }
  };

  const [expandedJobs, setExpandedJobs] = useState({});

  const groupedJobs = useMemo(() => {
    const map = new Map();

    history.forEach((inv) => {
      const jobKey = String(inv.job_no || 'Unknown');
      if (!map.has(jobKey)) {
        map.set(jobKey, {
          job_no: inv.job_no,
          mbl_no: inv.mbl_hbl_type === 'MBL' ? inv.mbl_hbl_no : '',
          hbl_no: inv.mbl_hbl_type === 'HBL' ? inv.mbl_hbl_no : '',
          clients: new Set(),
          invoices: [],
          latestDate: inv.invoice_date || inv.created_at,
          totalInr: 0,
          totalUsd: 0,
          taxInvoiceCount: 0,
          debitNoteCount: 0,
          creditNoteCount: 0
        });
      }

      const group = map.get(jobKey);
      group.invoices.push(inv);
      if (inv.client_name) group.clients.add(inv.client_name);
      if (inv.mbl_hbl_type === 'MBL' && inv.mbl_hbl_no && !group.mbl_no) {
        group.mbl_no = inv.mbl_hbl_no;
      }
      if (inv.mbl_hbl_type === 'HBL' && inv.mbl_hbl_no && !group.hbl_no) {
        group.hbl_no = inv.mbl_hbl_no;
      }

      // Parse totals
      let grandTotal = 0;
      try {
        const parsedTotals = typeof inv.totals === 'string' ? JSON.parse(inv.totals) : (inv.totals || {});
        grandTotal = parseFloat(parsedTotals.grandTotal || 0);
      } catch (e) {}

      const isDebitNote = inv.print_type === 'USD' || String(inv.invoice_no || '').startsWith('SSRDN');
      const isCreditNote = inv.print_type === 'CreditNote' || String(inv.invoice_no || '').startsWith('SSRCN');

      if (isCreditNote) {
        group.creditNoteCount++;
      } else if (isDebitNote) {
        group.debitNoteCount++;
        group.totalUsd += grandTotal;
      } else {
        group.taxInvoiceCount++;
        group.totalInr += grandTotal;
      }

      const invDate = new Date(inv.invoice_date || inv.created_at);
      if (invDate > new Date(group.latestDate)) {
        group.latestDate = inv.invoice_date || inv.created_at;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.job_no) || 0;
      const numB = parseInt(b.job_no) || 0;
      return numB - numA;
    });
  }, [history]);

  const filteredGroupedJobs = useMemo(() => {
    if (!historySearchTerm.trim()) return groupedJobs;
    const q = historySearchTerm.toLowerCase().trim();

    return groupedJobs.filter((group) => {
      const matchJob = String(group.job_no).toLowerCase().includes(q);
      const matchMbl = String(group.mbl_no || '').toLowerCase().includes(q);
      const matchHbl = String(group.hbl_no || '').toLowerCase().includes(q);
      const matchClient = Array.from(group.clients).some(c => String(c).toLowerCase().includes(q));
      const matchAnyInv = group.invoices.some(inv =>
        String(inv.invoice_no || '').toLowerCase().includes(q) ||
        String(inv.mbl_hbl_no || '').toLowerCase().includes(q)
      );
      return matchJob || matchMbl || matchHbl || matchClient || matchAnyInv;
    });
  }, [groupedJobs, historySearchTerm]);

  // When searching, auto-expand matching jobs
  useEffect(() => {
    if (historySearchTerm.trim()) {
      const autoExp = {};
      filteredGroupedJobs.forEach(g => {
        autoExp[g.job_no] = true;
      });
      setExpandedJobs(autoExp);
    }
  }, [historySearchTerm, filteredGroupedJobs]);

  const toggleJobExpand = (jobNo) => {
    setExpandedJobs(prev => ({
      ...prev,
      [jobNo]: !prev[jobNo]
    }));
  };

  const expandAllJobs = () => {
    const all = {};
    filteredGroupedJobs.forEach(g => {
      all[g.job_no] = true;
    });
    setExpandedJobs(all);
  };

  const collapseAllJobs = () => {
    setExpandedJobs({});
  };

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

  const getClientDetails = () => {
    if (!selectedClient) return null;
    return (
      filteredCustomers.find(c => String(c.customer_id) === String(selectedClient) || c.name === selectedClient) ||
      customers.find(c => String(c.customer_id) === String(selectedClient) || c.name === selectedClient) ||
      { customer_id: selectedClient, name: selectedClient, address: '', gstin: '' }
    );
  };

  const displayedCharges = useMemo(() => {
    if (!selectedClient) {
      return allCharges.map((item, originalIndex) => ({ ...item, originalIndex }));
    }
    const client = getClientDetails();
    const allCustList = [...filteredCustomers, ...customers];

    const filtered = allCharges
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter(row => {
        if (!row.party) return true;
        const rowPartyStr = String(row.party).toLowerCase().trim();
        const selClientStr = String(selectedClient).toLowerCase().trim();
        if (rowPartyStr === selClientStr) return true;
        if (client) {
          const clientNameStr = String(client.name || '').toLowerCase().trim();
          const clientIdStr = String(client.customer_id || '').toLowerCase().trim();
          if (clientNameStr && (rowPartyStr === clientNameStr || rowPartyStr.includes(clientNameStr) || clientNameStr.includes(rowPartyStr))) return true;
          if (clientIdStr && rowPartyStr === clientIdStr) return true;
          const partyCust = allCustList.find(c => String(c.customer_id) === String(row.party));
          if (partyCust) {
            const pNameStr = String(partyCust.name || '').toLowerCase().trim();
            if (pNameStr && (pNameStr === clientNameStr || pNameStr.includes(clientNameStr) || clientNameStr.includes(pNameStr))) return true;
          }
        }
        return false;
      });

    if (filtered.length === 0 && allCharges.length > 0) {
      return allCharges.map((item, originalIndex) => ({ ...item, originalIndex }));
    }
    return filtered;
  }, [allCharges, selectedClient, filteredCustomers, customers]);

  const calculateGridTotals = () => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const client = getClientDetails();
    const isMaharashtra = client && (String(client.gstin || '').startsWith('27') || String(client.address || '').toLowerCase().includes('maharashtra'));

    displayedCharges.forEach((item) => {
      if (!checkedItems[item.originalIndex]) return;

      const qty = parseFloat(item.quantity || 1);
      const rate = parseFloat(item.rate || 0);
      const itemCurrency = item.currency || 'USD';
      const rowExRate = parseFloat(item.ex_rate || jobExchangeRate || 85.00);

      let baseAmount = qty * rate; // in native currency

      if (printType === 'USD') {
        // We sum everything in USD values with 0 GST for USD Invoices
        let amountUSD = baseAmount;
        if (itemCurrency === 'INR') {
          amountUSD = baseAmount / rowExRate;
        }

        subtotal += amountUSD;
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
    setCalcTotals({ subtotal, cgst, sgst, igst, grandTotal });
  };

  // Trigger real-time calculation whenever selected charges, client, print type, or ex-rate changes
  useEffect(() => {
    calculateGridTotals();
  }, [checkedItems, displayedCharges, selectedClient, printType, jobExchangeRate]);

  const loadInitData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/invoice/init");
      if (res.data.success) {
        setMblJobs(res.data.mblJobs || []);
        setHblJobs(res.data.hblJobs || []);
        setCustomers(res.data.customers || []);
      }
    } catch (error) {
      console.error("Error loading tax invoice init data:", error);
      toast.error("Failed to load setup directories.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get("/invoice/history");
      if (res.data.success) {
        setHistory(res.data.invoices || []);
      }
    } catch (error) {
      console.error("Error loading tax invoice history:", error);
    }
  };

  const fetchJobDetails = async (jobNo) => {
    try {
      const res = await api.get(`/invoice/job-details/${jobNo}`);
      if (res.data.success) {
        const job = res.data.job;
        setCurrentJob(job);
        const options = [];

        // 1. Add MBL option
        if (job.mbl_no) {
          options.push({ label: `MBL: ${job.mbl_no}`, type: "MBL", number: job.mbl_no });
        }

        // 2. Add HBL options
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
      console.error("Error fetching job details for Tax Invoice:", error);
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
        const res = await api.get("/invoice/search-charges", {
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
      toast.warning("Please select a Job No");
      return;
    }
    if (!selectedMblHbl) {
      toast.warning("Please select an MBL / HBL Number");
      return;
    }

    try {
      setSearchTriggered(true);
      const chosenBL = JSON.parse(selectedMblHbl);
      
      const res = await api.get("/invoice/search-charges", {
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

  const handleCheckboxChange = (index) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSelectAll = (checked) => {
    setCheckedItems(prev => {
      const checks = { ...prev };
      displayedCharges.forEach(item => {
        checks[item.originalIndex] = checked;
      });
      return checks;
    });
  };

  const handleProcessInvoice = async () => {
    const client = getClientDetails();
    if (!client) {
      toast.error("Please select a valid Client / Vendor!");
      return;
    }

    const selectedItems = displayedCharges.filter(item => checkedItems[item.originalIndex]);
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
        invoiceDate,
        items: selectedItems,
        totals: calcTotals,
        exRate: jobExchangeRate
      };

      const res = await api.post("/invoice/save", payload);

      if (res.data.success) {
        toast.success(`Successfully saved Tax Invoice #${res.data.invoiceNo}`);
        setPreviewPdfUrl(res.data.pdfUrl);
        
        // Dynamically trigger automatic PDF file download to their PC
        if (res.data.pdfUrl) {
          const downloadLink = document.createElement("a");
          downloadLink.href = res.data.pdfUrl;
          downloadLink.setAttribute("download", `TaxInvoice_${res.data.invoiceNo.replace(/\//g, '_')}.pdf`);
          downloadLink.setAttribute("target", "_blank");
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }

        setShowPreviewModal(true);
        loadHistory(); // reload logs
      } else {
        toast.error("Generation failed: " + res.data.message);
      }
    } catch (error) {
      console.error("Error generating tax invoice:", error);
      toast.error("API error while generating Tax Invoice PDF: " + (error.response?.data?.message || error.message));
    } finally {
      setProcessing(false);
    }
  };

  const openPastPreview = (pdfUrl) => {
    setPreviewPdfUrl(pdfUrl);
    setShowPreviewModal(true);
  };

  const handleDeleteInvoice = async (id, invoiceNo) => {
    if (!window.confirm(`Are you sure you want to delete Tax Invoice #${invoiceNo}? This will delete the invoice from the database, unlock job sell rates, and reset the job status.`)) {
      return;
    }
    try {
      const res = await api.delete(`/invoice/delete/${id}`);
      if (res.data.success) {
        toast.success(res.data.message || `Tax Invoice #${invoiceNo} has been deleted.`);
        loadHistory(); // Reload history
      } else {
        toast.error("Deletion failed: " + res.data.message);
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <DashboardLayout title="Tax Invoice Generator">
      <div className="space-y-6 w-full p-1 font-poppins">
        
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
            Generate Invoice
          </button>
          <button
            onClick={() => setActiveTab("stored")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "stored"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Stored Invoices
          </button>
        </div>

        {activeTab === "generate" ? (
          <>
            {/* TOP FILTER CONTROLS */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-md p-6 rounded-2xl transition-all duration-300">
          <h3 className="text-md font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileText size={20} className="text-indigo-500" /> Filter Billing Context (Tax Invoice)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            
            {/* 1. MBL Job Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Select Job No</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-4">
            {/* Ex-Rate setting */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">USD Exchange Rate (Ex Rate)</label>
              <input
                type="text"
                value={exchangeRateInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setExchangeRateInput(val);
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed) && parsed > 0) {
                    setJobExchangeRate(parsed);
                  }
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="85.00"
              />
            </div>

            {/* Invoice Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tax Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-end gap-3 sm:col-span-2">
              <button
                type="button"
                onClick={handleSearchCharges}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 h-[44px]"
              >
                <Search size={16} /> Search Charges
              </button>

              <button
                type="button"
                onClick={handleProcessInvoice}
                disabled={processing || allCharges.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 h-[44px] disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Printer size={16} /> Process Tax Invoice
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
                GST rules split CGST/SGST based on Client supply location. Processing locks sell rates permanently.
              </span>
            </h3>

            <div className="overflow-x-auto custom-scrollbar border border-slate-200 dark:border-slate-700/80 rounded-xl">
              <table className="w-full text-left border-collapse table-fixed text-xs min-w-[1150px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 text-center w-[40px]">
                      <input
                        type="checkbox"
                        checked={displayedCharges.length > 0 && displayedCharges.every(item => checkedItems[item.originalIndex])}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5 w-[180px]">Party (Client/Vendor)</th>
                    <th className="p-3.5 w-[320px]">Charge Name</th>
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
                  {displayedCharges.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="p-8 text-center text-slate-500 italic">
                        {allCharges.length === 0 ? "No Sell Rates found for this BL number." : "No charge rows found for the selected company."}
                      </td>
                    </tr>
                  ) : (
                    displayedCharges.map((row) => {
                      const idx = row.originalIndex;
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
          /* JOB-WISE TAX INVOICES & DEBIT NOTES ARCHIVE HISTORY */
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 shadow-md p-6 rounded-2xl transition-all duration-300">
            {/* Top Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 gap-4">
              <div>
                <h3 className="text-md font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers size={20} className="text-indigo-500" /> Job-Wise Invoices & Debit Notes Log
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Invoices, Debit Notes, and Credit Notes organized by Job. Open any job to view all its documents.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Box */}
                <div className="flex items-center gap-2 max-w-sm w-full">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search Job No, BL No, Client, Invoice..."
                      value={searchVal}
                      onChange={(e) => setSearchVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setHistorySearchTerm(searchVal);
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    {searchVal && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchVal("");
                          setHistorySearchTerm("");
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setHistorySearchTerm(searchVal)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm hover:shadow"
                  >
                    Search
                  </button>
                </div>

                {/* Expand / Collapse All */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={expandAllJobs}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllJobs}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                  >
                    Collapse All
                  </button>
                </div>

                {/* Summary badge */}
                <span className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                  {filteredGroupedJobs.length} Job{filteredGroupedJobs.length !== 1 ? 's' : ''} ({history.length} Doc{history.length !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Job Wise List */}
            {filteredGroupedJobs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <FileText size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-base">No matching jobs or invoices located.</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing your search term or generate a new invoice.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroupedJobs.map((group) => {
                  const isExpanded = !!expandedJobs[group.job_no];
                  return (
                    <div
                      key={group.job_no}
                      className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? "border-indigo-200 dark:border-indigo-900/60 shadow-md bg-white dark:bg-dark-card"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/60"
                      }`}
                    >
                      {/* Job Header Summary Bar (Clickable) */}
                      <div
                        onClick={() => toggleJobExpand(group.job_no)}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        {/* Left: Job Number + BL Identifiers */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                            <ChevronDown
                              size={18}
                              className={`transition-transform duration-200 ${isExpanded ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""}`}
                            />
                          </span>

                          <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-bold font-mono text-sm tracking-wide shadow-sm flex items-center gap-1.5">
                            <Folder size={14} /> Job #{group.job_no}
                          </span>

                          {group.mbl_no && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-mono text-xs font-semibold border border-blue-200 dark:border-blue-800/60">
                              MBL: {group.mbl_no}
                            </span>
                          )}

                          {group.hbl_no && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-mono text-xs font-semibold border border-purple-200 dark:border-purple-800/60">
                              HBL: {group.hbl_no}
                            </span>
                          )}
                        </div>

                        {/* Middle: Client Name & Document Pills */}
                        <div className="flex flex-wrap items-center gap-3">
                          {group.clients.size > 0 && (
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg max-w-sm truncate">
                              <Building2 size={13} className="text-slate-400 shrink-0" />
                              <span className="truncate">{Array.from(group.clients).join(', ')}</span>
                            </span>
                          )}

                          {/* Document count pill breakdown */}
                          <div className="flex items-center gap-1.5">
                            {group.taxInvoiceCount > 0 && (
                              <span className="px-2 py-0.5 bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800/50">
                                {group.taxInvoiceCount} Invoice{group.taxInvoiceCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {group.debitNoteCount > 0 && (
                              <span className="px-2 py-0.5 bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800/50">
                                {group.debitNoteCount} Debit Note{group.debitNoteCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {group.creditNoteCount > 0 && (
                              <span className="px-2 py-0.5 bg-rose-100/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-bold rounded-full border border-rose-200 dark:border-rose-800/50">
                                {group.creditNoteCount} Credit Note{group.creditNoteCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Date & Toggle Button */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            Latest: {new Date(group.latestDate).toLocaleDateString()}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleJobExpand(group.job_no);
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                              isExpanded
                                ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                                : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                            }`}
                          >
                            {isExpanded ? "Hide Documents" : `View Documents (${group.invoices.length})`}
                          </button>
                        </div>
                      </div>

                      {/* Expanded View: All Invoices & Notes for this Job */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-3">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse table-auto text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider whitespace-nowrap">
                                  <th className="py-2.5 px-3 rounded-l-xl">Doc / Invoice No</th>
                                  <th className="py-2.5 px-3">Doc Type</th>
                                  <th className="py-2.5 px-3">BL Type & Number</th>
                                  <th className="py-2.5 px-3">Billing Client</th>
                                  <th className="py-2.5 px-3 text-right">Amount</th>
                                  <th className="py-2.5 px-3 text-center">Date</th>
                                  <th className="py-2.5 px-3 text-right rounded-r-xl">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {group.invoices.map((inv) => {
                                  const isDebit = inv.print_type === 'USD' || String(inv.invoice_no || '').startsWith('SSRDN');
                                  const isCredit = inv.print_type === 'CreditNote' || String(inv.invoice_no || '').startsWith('SSRCN');
                                  
                                  let docGrandTotal = 0;
                                  try {
                                    const parsedTotals = typeof inv.totals === 'string' ? JSON.parse(inv.totals) : (inv.totals || {});
                                    docGrandTotal = parseFloat(parsedTotals.grandTotal || 0);
                                  } catch (e) {}

                                  return (
                                    <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap">
                                      {/* Invoice No */}
                                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white font-mono text-xs whitespace-nowrap">
                                        #{inv.invoice_no || inv.id}
                                      </td>

                                      {/* Doc Type Badge */}
                                      <td className="py-2 px-3 whitespace-nowrap">
                                        {isCredit ? (
                                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300">
                                            Credit Note
                                          </span>
                                        ) : isDebit ? (
                                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                                            Debit Note
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                                            Tax Invoice
                                          </span>
                                        )}
                                      </td>

                                      {/* BL Type & Number */}
                                      <td className="py-2 px-3 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                            inv.mbl_hbl_type === 'MBL' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                                          }`}>
                                            {inv.mbl_hbl_type}
                                          </span>
                                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-medium">
                                            {inv.mbl_hbl_no || '—'}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Billing Client */}
                                      <td className="py-2 px-3 whitespace-nowrap">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                          {inv.client_name || '—'}
                                        </span>
                                        {inv.client_gstin && (
                                          <span className="ml-1.5 text-[11px] text-slate-400 font-mono">
                                            ({inv.client_gstin})
                                          </span>
                                        )}
                                      </td>

                                      {/* Total Amount */}
                                      <td className="py-2 px-3 text-right whitespace-nowrap">
                                        <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                                          {inv.print_type === 'USD'
                                            ? `$ ${docGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            : `₹ ${docGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                        </span>
                                      </td>

                                      {/* Date */}
                                      <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                                        {new Date(inv.invoice_date || inv.created_at).toLocaleDateString()}
                                      </td>

                                      {/* Actions (Only Preview & Download) */}
                                      <td className="py-2 px-3 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            onClick={() => openPastPreview(inv.pdf_link)}
                                            title="Interactive Preview PDF"
                                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-40 shadow-xs"
                                            disabled={!inv.pdf_link}
                                          >
                                            <Eye size={15} />
                                          </button>
                                          <a
                                            href={inv.pdf_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Download PDF File"
                                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 dark:text-emerald-400 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-40 shadow-xs"
                                            disabled={!inv.pdf_link}
                                          >
                                            <Download size={15} />
                                          </a>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                  Interactive Tax Invoice PDF Preview
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

      {/* EDIT MODAL FOR STORED INVOICE */}
      {showEditModal && editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="relative bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-500" />
                <h3 className="text-md font-bold text-slate-800 dark:text-white font-poppins">
                  Edit Invoice - #{editingInvoice.invoice_no}
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs Selector */}
            <div className="px-6 pt-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex gap-4 text-sm font-semibold">
              <button
                onClick={() => setEditActiveTab("main")}
                className={`pb-2.5 border-b-2 transition-all ${
                  editActiveTab === "main"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Main
              </button>
              <button
                onClick={() => setEditActiveTab("detail")}
                className={`pb-2.5 border-b-2 transition-all ${
                  editActiveTab === "detail"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Detail
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-dark-card space-y-6">
              {editActiveTab === "main" ? (
                /* MAIN TAB CONTENT */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Job No</label>
                    <input
                      type="text"
                      value={editingInvoice.job_no}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-2.5 text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">JobType</label>
                    <input
                      type="text"
                      value={editingInvoice.mbl_hbl_type}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-2.5 text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Party Type</label>
                    <input
                      type="text"
                      value="Client"
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-2.5 text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">DRCR Type</label>
                    <input
                      type="text"
                      value="Inv"
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-2.5 text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invoice No</label>
                    <input
                      type="text"
                      value={editingInvoice.invoice_no}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-2.5 text-slate-500 outline-none cursor-not-allowed font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invoice Date</label>
                    <input
                      type="date"
                      value={editInvoiceDate}
                      onChange={(e) => setEditInvoiceDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Party</label>
                    <input
                      type="text"
                      value={editingInvoice.client_name}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-2.5 text-slate-500 outline-none cursor-not-allowed font-semibold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Address</label>
                    <textarea
                      value={editingInvoice.client_address}
                      disabled
                      rows="2"
                      className="w-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-2.5 text-slate-500 outline-none cursor-not-allowed resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Currency</label>
                    <input
                      type="text"
                      value={editingInvoice.print_type === 'USD' ? 'USD' : 'INR'}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-2.5 text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ex Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editExRate}
                      onChange={(e) => handleEditExRateChange(parseFloat(e.target.value) || 1.00)}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">GST State From</label>
                    <input
                      type="text"
                      value={editingInvoice.client_state === '27' ? 'Maharashtra' : `State Code: ${editingInvoice.client_state || 'N/A'}`}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-2.5 text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remarks / Narration</label>
                    <textarea
                      value={editRemarks}
                      onChange={(e) => setEditRemarks(e.target.value)}
                      rows="3"
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Enter remarks..."
                    />
                  </div>
                </div>
              ) : (
                /* DETAIL TAB CONTENT */
                <div className="space-y-6">
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-xl">
                    <table className="w-full text-left border-collapse min-w-[1100px] text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                          <th className="p-3">Charge</th>
                          <th className="p-3 text-center">GST</th>
                          <th className="p-3 text-center">Unit</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Rate</th>
                          <th className="p-3 text-center">Cur</th>
                          <th className="p-3 text-right">Ex Rate</th>
                          <th className="p-3 text-right">Amount</th>
                          <th className="p-3 text-right">Amount FC</th>
                          <th className="p-3">Narration</th>
                          <th className="p-3 text-center w-[60px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {editItems.map((item, idx) => {
                          const qty = parseFloat(item.quantity || item.qty || 1);
                          const rate = parseFloat(item.rate || 0);
                          const currency = item.currency || 'USD';
                          const ex = parseFloat(item.ex_rate || item.exRate || 1);
                          const fcAmt = qty * rate;
                          
                          let printedAmt = fcAmt;
                          if (editingInvoice.print_type === 'USD') {
                            if (currency === 'INR') printedAmt = fcAmt / ex;
                          } else {
                            if (currency === 'USD') printedAmt = fcAmt * ex;
                          }

                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                              <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                {item.charge || item.chargeName || '—'}
                              </td>
                              <td className="p-3 text-center font-bold text-teal-600">
                                {item.gst || item.taxPercent || '0'}%
                              </td>
                              <td className="p-3 text-center text-slate-500">
                                {item.unit || '—'}
                              </td>
                              <td className="p-3 text-center font-semibold">
                                {qty}
                              </td>
                              <td className="p-3 text-right">
                                {rate.toFixed(2)}
                              </td>
                              <td className="p-3 text-center font-bold text-slate-400">
                                {currency}
                              </td>
                              <td className="p-3 text-right text-slate-500">
                                {ex.toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                {printedAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right text-slate-500">
                                {fcAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-xs text-slate-500 max-w-[150px] truncate" title={item.narration || ''}>
                                {item.narration || '—'}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEditItem(idx)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                                  title="Delete Charge Row"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Panel */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 space-y-3 font-mono text-sm max-w-md ml-auto">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Subtotal:</span>
                      <span className="font-bold">
                        {editingInvoice.print_type === 'USD' ? '$' : '₹'} {editTotals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {editTotals.cgst > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>CGST split:</span>
                        <span className="font-bold">
                          {editingInvoice.print_type === 'USD' ? '$' : '₹'} {editTotals.cgst.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {editTotals.sgst > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>SGST split:</span>
                        <span className="font-bold">
                          {editingInvoice.print_type === 'USD' ? '$' : '₹'} {editTotals.sgst.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {editTotals.igst > 0 && (
                      <div className="flex justify-between text-teal-600 dark:text-teal-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span>IGST Component:</span>
                        <span className="font-bold">
                          {editingInvoice.print_type === 'USD' ? '$' : '₹'} {editTotals.igst.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-md font-bold text-slate-800 dark:text-white pt-1">
                      <span>Grand Total:</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-lg">
                        {editingInvoice.print_type === 'USD' ? '$' : '₹'} {editTotals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit || editItems.length === 0}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 transition-all"
              >
                {savingEdit ? "Saving Details..." : "Save Details"}
              </button>
            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
