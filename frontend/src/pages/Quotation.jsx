import React, { useState, useMemo, useEffect, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import PortSelect from "../components/PortSelect";
import SearchableDropdown from "../components/SearchableDropdown";
import { Copy, Mail, RefreshCw, MessageSquare, History, FilePlus2, FileText, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

// Strip GST/IGST suffix from charge names for display
const cleanChargeName = (name) => {
    if (!name) return name;
    return name
        .replace(/\s*[-–]?\s*(I?GST)\s*[-–]?\s*\d+%/gi, '')
        .replace(/\s*(I?GST)\s*[-–]?\s*\d+\s*%/gi, '')
        .replace(/\s+$/, '')
        .trim();
};

const defaultTerms = `- GST will be applicable as per the tariff.
- Certain components of Ocean Freight attract 18% GST, which can only be confirmed upon receipt of the carrier’s invoice.
- Line Detention / Demurrage charges apply as per the carrier’s tariff, if applicable.
- Port Storage charges apply as per the port’s tariff, if applicable.
- Shipper/Consignee must ensure all required ministry, customs, and official approvals are obtained.
- Amendment, Cancellation, or Roll Over charges apply for any booking changes.
- Subject to terms and conditions of the carrier’s Bill of Lading.
- Arrival, departure, and transit times are estimates and not guaranteed.
- This quotation does not include any form of cargo insurance.
- Rates are subject to change as per the carrier’s terms.`;

const defaultRemarks = "14 FREE DAYS TOLL and MUC included in THC";

const defaultQuotation = {
    client_name: "",
    phone_number: "",
    email: "",
    address: "",
    commodity: "",
    incoterms: "",
    pol: "",
    pod: "",
    containersize: "",
    validity: "",
    transit_time: "",
    remarks: defaultRemarks,
    terms: defaultTerms,
    charges: []
};

const commodityOptions = [
    "General Cargo",
    "Garments",
    "Chemicals (Hazardous)",
    "Chemicals (Non-Hazardous)",
    "Foodstuffs",
    "Machinery",
    "Electronics",
    "Scrap",
    "Personal Effects"
];

const incotermOptions = [
    "EXW (Ex Works)",
    "FCA (Free Carrier)",
    "FAS (Free Alongside Ship)",
    "FOB (Free on Board)",
    "CFR (Cost and Freight)",
    "CIF (Cost, Insurance and Freight)",
    "CPT (Carriage Paid To)",
    "CIP (Carriage and Insurance Paid To)",
    "DAP (Delivered at Place)",
    "DPU (Delivered at Place Unloaded)",
    "DDP (Delivered Duty Paid)"
];

const fallbackCharges = [
    "OCEAN FREIGHT",
    "THC (TERMINAL HANDLING CHARGES)",
    "TOLL CHARGES",
    "MUC (MANDATORY USAGE CHARGES)",
    "SEAL FEE",
    "BL FEES(OBL)",
    "DOCUMENTATION CHARGES",
    "VGM CHARGES",
    "CUSTOMS CLEARANCE CHARGES",
    "HAULAGE CHARGES",
    "CFS CHARGES",
    "DO CHARGES",
    "AIR FREIGHT CHARGES",
    "CONSOLIDATION CHARGES",
    "DETENTION CHARGES",
    "PORT CONGESTION CHARGE",
    "PORT STORAGE",
    "SCANNING CHARGES",
    "SHIPPING LINE CHARGES",
    "WEIGHTMENT CHARGES"
];

// Searchable autocomplete combobox for charge names (follows PortSelect pattern)
const ChargeNameInput = ({ value, onChange, suggestions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const listRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Scroll active item into view
    useEffect(() => {
        if (isOpen && listRef.current && activeIndex >= 0) {
            const item = listRef.current.children[activeIndex];
            if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [activeIndex, isOpen]);

    const uniqueSuggestions = useMemo(() => [...new Set(suggestions)], [suggestions]);
    const filtered = useMemo(() => {
        if (!value || !value.trim()) return [];
        const lower = value.toLowerCase();
        return uniqueSuggestions.filter(s => s.toLowerCase().includes(lower)).slice(0, 50);
    }, [uniqueSuggestions, value]);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if ((e.key === 'ArrowDown' || e.key === 'Enter') && value && value.trim()) setIsOpen(true);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && filtered[activeIndex]) handleSelect(filtered[activeIndex]);
            else if (filtered.length > 0) handleSelect(filtered[0]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                value={value || ""}
                placeholder="Type or select charge..."
                autoComplete="off"
                onFocus={() => { if (value && value.trim()) setIsOpen(true); }}
                onChange={(e) => { onChange(e.target.value); setIsOpen(true); setActiveIndex(-1); }}
                onKeyDown={handleKeyDown}
                className="w-full px-1.5 py-0.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {isOpen && filtered.length > 0 && (
                <div ref={listRef} className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                    {filtered.map((option, index) => (
                        <div
                            key={option}
                            className={`px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                                index === activeIndex
                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200'
                            } ${value === option ? 'font-semibold' : ''}`}
                            onClick={() => handleSelect(option)}
                        >
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Quotation = () => {
    const [activeTab, setActiveTab] = useState("create"); // "create" or "sent"
    const [sentQuotations, setSentQuotations] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [availableCharges, setAvailableCharges] = useState(fallbackCharges.map(name => ({ name })));

    // We now maintain an array of quotations
    const [quotationItems, setQuotationItems] = useState([{ ...defaultQuotation }]);

    const fetchSentQuotations = async () => {
        try {
            const res = await api.get("/quotation/all");
            if (res.data.success) {
                setSentQuotations(res.data.quotations);
            }
        } catch (error) {
            console.error("Failed to fetch sent quotations", error);
            toast.error("Failed to load sent quotations");
        }
    };

    const [rawApiCharges, setRawApiCharges] = useState([]);

    const fetchCharges = async () => {
        try {
            const res = await api.get("/quotation/charges");
            if (res.data.success && Array.isArray(res.data.charges)) {
                setRawApiCharges(res.data.charges);
                const cleanedApi = res.data.charges.map(c => cleanChargeName(c.name)).filter(Boolean);
                const combined = [...new Set([...cleanedApi, ...fallbackCharges])];
                setAvailableCharges(combined.map(name => ({ name })));
            } else {
                console.warn("Failed to load charges from API, using fallback list");
                setAvailableCharges(fallbackCharges.map(name => ({ name })));
            }
        } catch (error) {
            console.warn("Failed to fetch charges API, using fallback list:", error);
            setAvailableCharges(fallbackCharges.map(name => ({ name })));
        }
    };

    const [partiesList, setPartiesList] = useState([]);

    const fetchParties = async () => {
        try {
            const res = await api.get("/party");
            if (res.data.success && Array.isArray(res.data.parties)) {
                setPartiesList(res.data.parties);
            }
        } catch (error) {
            console.error("Failed to fetch parties list in Quotation:", error);
        }
    };

    const partyOptions = useMemo(() => {
        return partiesList.map(p => ({
            value: p.id,
            label: p.name
        }));
    }, [partiesList]);

    const handlePartySelect = (qIndex, selectedValue) => {
        const party = partiesList.find(p => String(p.id) === String(selectedValue));
        if (!party) {
            // Custom string typed
            handleQuotationChange(qIndex, 'client_name', selectedValue);
            return;
        }

        let defaultAddr = {
            address_line1: '',
            address_line2: '',
            city: '',
            pin_code: '',
            gst_state: '',
            country: 'India',
            email: '',
            telephone: ''
        };

        if (party.addresses) {
            try {
                const addrs = typeof party.addresses === 'string' ? JSON.parse(party.addresses) : party.addresses;
                if (Array.isArray(addrs) && addrs.length > 0) {
                    const found = addrs.find(a => a.is_default) || addrs[0];
                    if (found) {
                        defaultAddr = { ...defaultAddr, ...found };
                    }
                }
            } catch (e) {
                console.error("Error parsing addresses for party select:", e);
            }
        }

        const addressParts = [
            defaultAddr.address_line1,
            defaultAddr.address_line2,
            defaultAddr.city,
            defaultAddr.pin_code,
            defaultAddr.gst_state,
            defaultAddr.country
        ].filter(part => part && String(part).trim() !== '');

        const addressStr = addressParts.join(', ');
        const emailVal = party.email || defaultAddr.email || '';
        const phoneVal = defaultAddr.telephone || '';

        setQuotationItems((prev) => {
            const newItems = [...prev];
            newItems[qIndex] = {
                ...newItems[qIndex],
                client_name: party.name,
                address: addressStr,
                email: emailVal,
                phone_number: phoneVal
            };
            return newItems;
        });
    };

    useEffect(() => {
        fetchCharges();
        fetchParties();
    }, []);

    useEffect(() => {
        if (activeTab === "sent") {
            fetchSentQuotations();
        }
    }, [activeTab]);

    const handleQuotationChange = (index, field, value) => {
        setQuotationItems((prev) => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });
    };

const isIndianPort = (portStr) => {
    if (!portStr) return false;
    const str = String(portStr).toLowerCase();
    return str.includes('india') || str.includes('innsa') || str.includes('inbom') || str.includes('inmaa') || str.includes('inmun') || str.includes('inccu') || str.includes('incok') || str.includes('intut') || str.includes('inixy') || str.includes('ingoi') || str.includes('invtz');
};

const getChargeCategory = (charge, pol, pod) => {
    if (charge.category) return charge.category.toLowerCase();
    
    const name = (charge.chargeName || '').toUpperCase();
    if (name.includes('FREIGHT') || name.includes('OCEAN') || name.includes('AIR') || name.includes('BAF') || name.includes('CAF')) {
        return 'freight';
    }
    if (name.includes('POD') || name.includes('DESTINATION') || name.includes('DO CHARGES') || name.includes('DELIVERY ORDER') || name.includes('CUSTOMS') || name.includes('DEMURRAGE') || name.includes('STORAGE') || name.includes('DETENTION') || name.includes('IMPORT') || name.includes('CFS')) {
        return 'destination';
    }
    if (name.includes('POL') || name.includes('ORIGIN') || name.includes('SEAL') || name.includes('MANDATORY') || name.includes('BL ') || name.includes('DOCUMENTATION') || name.includes('TOLL') || name.includes('VGM') || name.includes('EXPORT')) {
        return 'origin';
    }

    const isExport = isIndianPort(pol) || (!isIndianPort(pod) && !!pol);
    return isExport ? 'origin' : 'destination';
};

    const handleAddCharge = (qIndex, category = "freight") => {
        setQuotationItems((prev) =>
            prev.map((item, i) => {
                if (i !== qIndex) return item;
                const defaultName = category === "freight" ? "OCEAN FREIGHT" : "";
                const defaultCurr = category === "freight" ? "USD" : "INR";
                const defaultTax = category === "freight" ? "5" : "18";
                return {
                    ...item,
                    charges: [
                        ...item.charges,
                        {
                            chargeName: defaultName,
                            basis: "20'",
                            quantity: "1.00",
                            currency: defaultCurr,
                            amount: "",
                            tax: defaultTax,
                            category: category
                        }
                    ]
                };
            })
        );
    };

    const handleChargeChange = (qIndex, cIndex, field, value) => {
        setQuotationItems((prev) =>
            prev.map((item, i) => {
                if (i !== qIndex) return item;
                const updatedCharges = item.charges.map((c, j) => {
                    if (j !== cIndex) return c;
                    const newCharge = { ...c, [field]: value };
                    if (field === 'chargeName') {
                        const match = rawApiCharges.find(r => cleanChargeName(r.name) === cleanChargeName(value) || r.name === value);
                        if (match) {
                            if (match.gst_rate !== undefined && match.gst_rate !== null) newCharge.tax = String(match.gst_rate);
                            if (match.currency) newCharge.currency = match.currency;
                            if (match.basis) newCharge.basis = match.basis;
                        }
                    }
                    return newCharge;
                });
                return { ...item, charges: updatedCharges };
            })
        );
    };

    const handleRemoveCharge = (qIndex, cIndex) => {
        setQuotationItems((prev) =>
            prev.map((item, i) => {
                if (i !== qIndex) return item;
                return { ...item, charges: item.charges.filter((_, j) => j !== cIndex) };
            })
        );
    };

    const handleAddQuotation = () => {
        setQuotationItems(prev => [...prev, { ...defaultQuotation }]);
    };

    const handleRemoveQuotation = (index) => {
        if (quotationItems.length === 1) {
            setQuotationItems([{ ...defaultQuotation }]);
            return;
        }
        setQuotationItems(prev => prev.filter((_, i) => i !== index));
    };

    // Open default mail client
    const openMailClient = async (index) => {
        const formData = quotationItems[index];
        if (!formData.client_name || !formData.email || !formData.pol || !formData.pod) {
            alert("Please fill in Client Name, Email, POL, and POD to open mail.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Generating PDF and preparing Mail...");
        try {
            const response = await api.post("/quotation/generate-and-save", formData);
            if (!response.data.success) {
                throw new Error(response.data.message || "Failed to generate PDF");
            }

            const pdfUrl = response.data.pdfUrl;
            const to = formData.email || "";
            const subject = "Quotation from SSR Logistic Solutions";
            
            const lines = [
                `Dear ${formData.client_name || "Sir/Madam"},`,
                "",
                "Thank you for your inquiry. We are pleased to provide our best offer for your kind reference:",
                "",
                `POL: ${formData.pol || ""}`,
                `POD: ${formData.pod || ""}`,
                `Container wt/size: ${formData.containersize || ""}`,
                "",
                "Please find your complete quotation PDF attached via the following link:",
                pdfUrl,
                "",
                "We trust that the above offer is competitive and meets your requirements.",
                "We look forward to your kind confirmation for further bookings.",
                "",
                "Sincerely,",
                "SSR Logistic Solutions",
            ];
            const body = lines.join("\n");

            const mailto =
                "mailto:" +
                encodeURIComponent(to) +
                "?subject=" +
                encodeURIComponent(subject) +
                "&body=" +
                encodeURIComponent(body);

            window.location.href = mailto;
            toast.update(toastId, { render: "Successfully prepared Mail!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error("openMailClient error:", error);
            toast.update(toastId, { render: "Failed to process Mail send.", type: "error", isLoading: false, autoClose: 3000 });
            alert("Error: " + (error.message || "Failed to process mail send"));
        } finally {
            setIsUploading(false);
        }
    };

    // Send via WhatsApp
    const sendViaWhatsApp = async (index) => {
        const formData = quotationItems[index];
        if (!formData.client_name || !formData.phone_number || !formData.pol || !formData.pod) {
            alert("Please fill in Client Name, WhatsApp No., POL, and POD to send via WhatsApp.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Generating PDF and preparing WhatsApp...");

        try {
            const response = await api.post("/quotation/generate-and-save", formData);

            if (!response.data.success) {
                throw new Error(response.data.message || "Failed to generate PDF");
            }

            const pdfUrl = response.data.pdfUrl;
            const containerInfo = formData.containersize ? ` (${formData.containersize})` : '';

            const text = `Hi ${formData.client_name},\nHere's your quotation for shipping from ${formData.pol} to ${formData.pod}${containerInfo} : ${pdfUrl}`;
            
            const cleanPhone = formData.phone_number.replace(/\D/g, '');
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
            window.open(waUrl, "_blank");

            toast.update(toastId, { render: "Successfully sent via WhatsApp!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error("sendViaWhatsApp error:", error);
            toast.update(toastId, { render: "Unable to open WhatsApp.", type: "error", isLoading: false, autoClose: 3000 });
            alert("Error: " + (error.message || "Failed to process WhatsApp send"));
        } finally {
            setIsUploading(false);
        }
    };

    // Download PDF directly
    const handleDownloadPdf = async (index) => {
        const formData = quotationItems[index];
        if (!formData.client_name || !formData.pol || !formData.pod) {
            alert("Please fill in Client Name, POL, and POD to download PDF.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Downloading PDF...");

        try {
            const response = await api.post("/quotation/download-pdf", formData, { responseType: 'blob' });
            
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'Quote-SSR.pdf';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                    fileName = match[1];
                }
            }

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.update(toastId, { render: "PDF downloaded successfully!", type: "success", isLoading: false, autoClose: 3000 });
            fetchSentQuotations();
        } catch (error) {
            console.error("handleDownloadPdf error:", error);
            toast.update(toastId, { render: "Failed to download PDF.", type: "error", isLoading: false, autoClose: 3000 });
            alert("Error: " + (error.message || "Failed to download PDF"));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <DashboardLayout title="Quotation Management">
            
            {/* Tabs */}
            <div className="flex space-x-2 mb-4 bg-white dark:bg-dark-card p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
                <button
                    onClick={() => setActiveTab("create")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === "create" 
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                >
                    <FilePlus2 size={16} /> Create Quotation
                </button>
                <button
                    onClick={() => setActiveTab("sent")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === "sent" 
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                >
                    <History size={16} /> Sent Quotations
                </button>
            </div>

            {activeTab === "create" ? (
                <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-6">
                    {quotationItems.map((formData, qIndex) => (
                        <div key={qIndex} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 relative">
                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-600" /> Quotation #{qIndex + 1}
                                </h3>
                                <button
                                    onClick={() => handleRemoveQuotation(qIndex)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Remove Quotation"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); }}>
                                
                                {/* Row 1: Client Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                                    <div className="flex flex-col gap-0.5">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center">Client Name</label>
                                        <SearchableDropdown
                                            options={partyOptions}
                                            value={partiesList.find(p => p.name === formData.client_name)?.id || formData.client_name || ""}
                                            onChange={(val) => handlePartySelect(qIndex, val)}
                                            placeholder="Search client..."
                                            allowCustom={true}
                                            className="!rounded-lg !py-1.5 !h-[38px]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center">WhatsApp No.</label>
                                        <input type="text" value={formData.phone_number} onChange={(e) => handleQuotationChange(qIndex, 'phone_number', e.target.value)} placeholder="e.g. 919876543210" className="w-full px-3 py-1.5 h-[38px] text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center">Email To</label>
                                        <input type="email" value={formData.email} onChange={(e) => handleQuotationChange(qIndex, 'email', e.target.value)} placeholder="client@example.com" className="w-full px-3 py-1.5 h-[38px] text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" />
                                    </div>
                                </div>

                                {/* Row 1.5: Address, Commodity, Incoterms */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center">Client Address</label>
                                        <input type="text" value={formData.address} onChange={(e) => handleQuotationChange(qIndex, 'address', e.target.value)} placeholder="Address" className="w-full px-3 py-1.5 h-[38px] text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center">Commodity</label>
                                        <SearchableDropdown
                                            options={commodityOptions}
                                            value={formData.commodity}
                                            onChange={(val) => handleQuotationChange(qIndex, 'commodity', val)}
                                            placeholder="Select or type..."
                                            allowCustom={true}
                                            className="!rounded-lg !py-1.5 !h-[38px]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center">Incoterms</label>
                                        <SearchableDropdown
                                            options={incotermOptions}
                                            value={formData.incoterms}
                                            onChange={(val) => handleQuotationChange(qIndex, 'incoterms', val)}
                                            placeholder="Select or type..."
                                            allowCustom={true}
                                            className="!rounded-lg !py-1.5 !h-[38px]"
                                        />
                                    </div>
                                </div>

                                 {/* Row 2: Route & Cargo */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-end">
                                    <div>
                                        <PortSelect
                                            label="POL"
                                            name="pol"
                                            value={formData.pol}
                                            onChange={(e) => handleQuotationChange(qIndex, 'pol', e.target.value)}
                                            placeholder="Loading Port"
                                            labelClassName="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center"
                                            inputClassName="w-full pl-3 pr-8 py-1.5 h-[38px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-sm placeholder-slate-400"
                                        />
                                    </div>
                                    <div>
                                        <PortSelect
                                            label="POD"
                                            name="pod"
                                            value={formData.pod}
                                            onChange={(e) => handleQuotationChange(qIndex, 'pod', e.target.value)}
                                            placeholder="Discharge Port"
                                            labelClassName="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center"
                                            inputClassName="w-full pl-3 pr-8 py-1.5 h-[38px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-sm placeholder-slate-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center">Container wt/size</label>
                                        <input
                                            type="text"
                                            value={formData.containersize}
                                            onChange={(e) => handleQuotationChange(qIndex, 'containersize', e.target.value)}
                                            placeholder="e.g. 20 Dry / 24 Tons"
                                            className="w-full px-3 py-1.5 h-[38px] text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center">Transit Time</label>
                                        <input
                                            type="text"
                                            value={formData.transit_time}
                                            onChange={(e) => handleQuotationChange(qIndex, 'transit_time', e.target.value)}
                                            placeholder="e.g. 14 Days"
                                            className="w-full px-3 py-1.5 h-[38px] text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider h-4 flex items-center">Validity</label>
                                        <input
                                            type="date"
                                            value={formData.validity}
                                            onChange={(e) => handleQuotationChange(qIndex, 'validity', e.target.value)}
                                            className="w-full px-3 py-1.5 h-[38px] text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>

                                {/* Freight & Charges divided into 3 Sections */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                        <label className="block text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Freight & Local Charges</label>
                                        <div className="text-xs text-slate-500 font-medium">
                                            Shipment Type: <span className="font-bold text-indigo-600 dark:text-indigo-400">{isIndianPort(formData.pol) ? "Export (Indian POL)" : isIndianPort(formData.pod) ? "Import (Indian POD)" : "Cross Trade"}</span>
                                        </div>
                                    </div>

                                    {[
                                        { key: 'freight', title: 'Freight Charges', badge: null, defaultCurr: 'USD', defaultTax: '5' },
                                        { key: 'origin', title: 'Origin Charges', badge: isIndianPort(formData.pol) ? 'Export (Origin: POL India)' : null, defaultCurr: 'INR', defaultTax: '18' },
                                        { key: 'destination', title: 'Destination Charges', badge: isIndianPort(formData.pod) ? 'Import (Destination: POD India)' : null, defaultCurr: 'INR', defaultTax: '18' }
                                    ].map(sec => {
                                        const sectionCharges = formData.charges
                                            .map((c, realIndex) => ({ ...c, realIndex, computedCat: getChargeCategory(c, formData.pol, formData.pod) }))
                                            .filter(c => c.computedCat === sec.key);

                                        return (
                                            <div key={sec.key} className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/40 dark:bg-slate-800/20 relative overflow-visible focus-within:z-40">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">{sec.title}</span>
                                                        {sec.badge && (
                                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                                                                {sec.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddCharge(qIndex, sec.key)}
                                                        className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors"
                                                    >
                                                        <Plus size={14} /> Add {sec.title.replace(' Charges', '')} Charge
                                                    </button>
                                                </div>

                                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card relative overflow-visible focus-within:z-50">
                                                    <table className="w-full text-left text-xs border-collapse table-fixed min-w-full">
                                                        <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300">
                                                            <tr>
                                                                <th className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 text-left w-[28%]">Charge Head</th>
                                                                <th className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 text-left w-[15%]">Basis</th>
                                                                <th className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-700 text-center w-[11%]">Quantity</th>
                                                                <th className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-700 text-center w-[11%]">Currency</th>
                                                                <th className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-700 text-center w-[10%]">Rate</th>
                                                                <th className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-700 text-center w-[10%]">Tax (%)</th>
                                                                <th className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 text-center w-[12%]">Subtotal</th>
                                                                <th className="px-1 py-1.5 text-center w-[3%]"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {sectionCharges.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan="8" className="px-4 py-3 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                                                                        No {sec.title.toLowerCase()} added. Click "+ Add {sec.title.replace(' Charges', '')} Charge"
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                sectionCharges.map((charge) => {
                                                                    const cIndex = charge.realIndex;
                                                                    const qty = parseFloat(charge.quantity !== undefined ? charge.quantity : 1) || 0;
                                                                    const rate = parseFloat(charge.amount) || 0;
                                                                    const tax = parseFloat(charge.tax !== undefined ? charge.tax : sec.defaultTax) || 0;
                                                                    const subtotal = qty * rate * (1 + tax / 100);

                                                                    return (
                                                                        <tr key={cIndex} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors relative focus-within:z-50">
                                                                            <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-left align-middle relative overflow-visible">
                                                                                <SearchableDropdown
                                                                                    options={availableCharges.map(c => cleanChargeName(c.name)).filter(Boolean)}
                                                                                    value={charge.chargeName}
                                                                                    onChange={(val) => handleChargeChange(qIndex, cIndex, 'chargeName', val)}
                                                                                    placeholder="Type to search..."
                                                                                    allowCustom={true}
                                                                                    showOnlyWhenTyping={false}
                                                                                    variant="grid"
                                                                                    className="!py-0.5 !px-1.5 !rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs w-full text-left"
                                                                                    dropdownClassName="!z-[99999] top-full left-0 shadow-2xl border border-slate-200 dark:border-slate-700 min-w-[280px]"
                                                                                />
                                                                            </td>
                                                                            <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-left align-middle">
                                                                                <select
                                                                                    value={charge.basis || "20'"}
                                                                                    onChange={(e) => handleChargeChange(qIndex, cIndex, 'basis', e.target.value)}
                                                                                    className="w-full px-1 py-0.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                >
                                                                                    <option value="20'">20'</option>
                                                                                    <option value="40'">40'</option>
                                                                                    <option value="40 HQ">40 HQ</option>
                                                                                    <option value="CBM">LCL (CBM)</option>
                                                                                    <option value="Per BL">Per BL</option>
                                                                                    <option value="Per W/M">Per W/M</option>
                                                                                    <option value="Per Container">Per Container</option>
                                                                                </select>
                                                                            </td>
                                                                            <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center align-middle">
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    placeholder="1.00"
                                                                                    value={charge.quantity !== undefined ? charge.quantity : "1.00"}
                                                                                    onChange={(e) => handleChargeChange(qIndex, cIndex, 'quantity', e.target.value)}
                                                                                    className="w-full px-1.5 py-0.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                />
                                                                            </td>
                                                                            <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center align-middle">
                                                                                <select
                                                                                    value={charge.currency || sec.defaultCurr}
                                                                                    onChange={(e) => handleChargeChange(qIndex, cIndex, 'currency', e.target.value)}
                                                                                    className="w-full px-1 py-0.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                >
                                                                                    <option value="USD">USD</option>
                                                                                    <option value="INR">INR</option>
                                                                                    <option value="EUR">EUR</option>
                                                                                    <option value="GBP">GBP</option>
                                                                                    <option value="AED">AED</option>
                                                                                </select>
                                                                            </td>
                                                                            <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center align-middle">
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="0.00"
                                                                                    value={charge.amount}
                                                                                    onChange={(e) => handleChargeChange(qIndex, cIndex, 'amount', e.target.value)}
                                                                                    className="w-full px-1.5 py-0.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                />
                                                                            </td>
                                                                            <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center align-middle">
                                                                                <input
                                                                                    type="number"
                                                                                    placeholder={sec.defaultTax}
                                                                                    value={charge.tax !== undefined ? charge.tax : sec.defaultTax}
                                                                                    onChange={(e) => handleChargeChange(qIndex, cIndex, 'tax', e.target.value)}
                                                                                    className="w-full px-1.5 py-0.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                />
                                                                            </td>
                                                                            <td className="p-1 border-r border-slate-200 dark:border-slate-700 text-center align-middle text-xs font-extrabold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                                                                {(charge.currency || sec.defaultCurr) + " " + subtotal.toFixed(2)}
                                                                            </td>
                                                                            <td className="p-1 text-center align-middle">
                                                                                <button type="button" onClick={() => handleRemoveCharge(qIndex, cIndex)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>
                                
                                {/* Remarks */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">Remarks</label>
                                    <textarea
                                        value={formData.remarks}
                                        onChange={(e) => handleQuotationChange(qIndex, 'remarks', e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                                    ></textarea>
                                </div>

                                {/* Terms */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">Terms & Conditions <span className="font-normal text-slate-400 lowercase ml-1">(locked)</span></label>
                                    <textarea
                                        value={formData.terms}
                                        readOnly
                                        rows={4}
                                        className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed resize-none"
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex flex-wrap gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadPdf(qIndex)}
                                        disabled={isUploading}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <Download size={16} /> {isUploading ? "Downloading..." : "Download PDF"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => sendViaWhatsApp(qIndex)}
                                        disabled={isUploading}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <MessageSquare size={16} /> {isUploading ? "Sending..." : "Send via WhatsApp"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openMailClient(qIndex)}
                                        disabled={isUploading}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <Mail size={16} /> {isUploading ? "Preparing..." : "Open Mail"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ))}

                    {/* <div className="flex justify-center pt-2">
                        <button 
                            type="button" 
                            onClick={handleAddQuotation}
                            className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all"
                        >
                            <Plus size={16} /> Add Another Quotation
                        </button>
                    </div> */}
                </div>
            ) : (
                /* SENT QUOTATIONS SECTION */
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-[calc(100vh-12rem)] flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <History size={18} className="text-indigo-600" /> Sent Quotations Log
                        </h3>
                        <button
                            onClick={fetchSentQuotations}
                            className="text-sm flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar p-0">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Quote No</th>
                                    <th className="px-4 py-3 font-semibold">Date & Time</th>
                                    <th className="px-4 py-3 font-semibold">Client Name</th>
                                    <th className="px-4 py-3 font-semibold">Contact</th>
                                    <th className="px-4 py-3 font-semibold">Route</th>
                                    <th className="px-4 py-3 font-semibold">Container</th>
                                    <th className="px-4 py-3 font-semibold text-center">Document</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                {sentQuotations.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                            No sent quotations found.
                                        </td>
                                    </tr>
                                ) : (
                                    sentQuotations.map((q) => (
                                        <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                                                {q.quote_no || `Quote-SSR${1000 + q.id}`}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                                <div className="font-medium">{new Date(q.created_at).toLocaleDateString()}</div>
                                                <div className="text-xs text-slate-500">{new Date(q.created_at).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                                                {q.client_name || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                <div>{q.phone_number || "-"}</div>
                                                <div className="text-xs">{q.email || ""}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                <div className="font-medium">{q.pol || "-"}</div>
                                                <div className="text-xs">to {q.pod || "-"}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                {q.container_size_type || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {q.pdf_link ? (
                                                    <a
                                                        href={q.pdf_link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        <Download size={14} /> View PDF
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-400">No Link</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Quotation;