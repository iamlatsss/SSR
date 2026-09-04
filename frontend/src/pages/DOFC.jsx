import React, { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import SearchableDropdown from "../components/SearchableDropdown";
import api from "../services/api";
import { Search, Printer, FileText, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

// Helper to convert numbers to Indian Rupee Words
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

    if (n === 0) return 'Zero Rupees Only';

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

const DOFC = () => {
    const [activeTab, setActiveTab] = useState("DO"); // "DO" or "FC" or "CAN"
    const [jobs, setJobs] = useState([]);
    const [selectedJobNo, setSelectedJobNo] = useState("");
    const [selectedType, setSelectedType] = useState(""); // "HBL" or "MBL"
    const [previewData, setPreviewData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Freight Certificate Custom Charges State
    const [fcCharges, setFcCharges] = useState([
        { description: "Ocean Freight", sac: "996511", cur: "INR", rate: "", amount: "" }
    ]);
    const [masterCharges, setMasterCharges] = useState([]);

    // Searchable Select State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);
    const jobWrapperRef = useRef(null);
    const listRef = useRef(null);

    const [bookingUpdates, setBookingUpdates] = useState([]);

    useEffect(() => {
        fetchJobs();
        fetchBookingUpdates();
        fetchMasterCharges();
    }, []);

    const fetchMasterCharges = async () => {
        try {
            const res = await api.get("/invoice/charges");
            if (res.data.success) {
                setMasterCharges(res.data.charges || []);
            }
        } catch (error) {
            console.error("Error loading master charges:", error);
        }
    };

    // Close dropdown on click/touch outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (jobWrapperRef.current && !jobWrapperRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    // Auto-scroll active item into view when using keyboard arrow keys
    useEffect(() => {
        if (isDropdownOpen && listRef.current && activeIndex >= 0) {
            const activeItem = listRef.current.children[activeIndex];
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [activeIndex, isDropdownOpen]);

    const fetchBookingUpdates = async () => {
        try {
            const res = await api.get("/booking-updates");
            if (res.data.success) {
                setBookingUpdates(res.data.data || []);
            }
        } catch (error) {
            console.error("Error loading booking updates:", error);
        }
    };

    const fetchJobs = async () => {
        try {
            const res = await api.get("/masterbl/get");
            if (res.data.success) {
                setJobs(res.data.jobs || []);
            }
        } catch (error) {
            console.error("Error loading jobs:", error);
            toast.error("Failed to load jobs");
        } finally {
            setLoading(false);
        }
    };

    const selectedJob = useMemo(
        () => jobs.find((j) => String(j.job_no) === String(selectedJobNo)),
        [jobs, selectedJobNo]
    );

    // Filter jobs for dropdown by job_no, shipper, consignee, mbl_no, hbl_no
    const filteredOptions = useMemo(() => {
        const validJobs = jobs;

        if (!searchQuery || !searchQuery.trim()) return validJobs;
        const q = searchQuery.toLowerCase().trim();

        return validJobs.filter(j =>
            String(j.job_no || '').toLowerCase().includes(q) ||
            (j.shipper_name || "").toLowerCase().includes(q) ||
            (j.consignee_name || "").toLowerCase().includes(q) ||
            (j.mbl_no || "").toLowerCase().includes(q) ||
            (j.hbl_no || "").toLowerCase().includes(q)
        );
    }, [jobs, searchQuery]);

    const handleSelectJob = (job) => {
        setSelectedJobNo(job.job_no);
        const displayName = job.shipper_name ? `#${job.job_no} - ${job.shipper_name}` : `#${job.job_no}`;
        setSearchQuery(displayName);
        setIsDropdownOpen(false);
        setActiveIndex(-1);
        setPreviewData(null);
    };

    // Auto-fill query if just selecting programmatically or initial load match
    useEffect(() => {
        if (selectedJobNo && !searchQuery) {
            const j = jobs.find(j => String(j.job_no) === String(selectedJobNo));
            if (j) {
                setSearchQuery(`#${j.job_no} - ${j.shipper_name}`);
            }
        }
    }, [selectedJobNo, jobs]);


    // Compute options
    const typeOptions = useMemo(() => {
        if (!selectedJob) return [];
        const opts = [];
        // HBL Option (Always show if job selected, maybe indicate if no number)
        opts.push({
            value: "HBL",
            label: selectedJob.hbl_no ? `HBL - ${selectedJob.hbl_no}` : "HBL (No No.)",
            disabled: false
        });

        // MBL Option (Always show if job selected)
        opts.push({
            value: "MBL",
            label: selectedJob.mbl_no ? `MBL - ${selectedJob.mbl_no}` : "MBL (No No.)",
            disabled: false
        });

        return opts;
    }, [selectedJob]);

    // Auto-select HBL when job changes, or MBL if HBL not available but MBL is
    useEffect(() => {
        if (selectedJob) {
            if (selectedJob.hbl_no) {
                setSelectedType("HBL");
            } else if (selectedJob.mbl_no) {
                setSelectedType("MBL");
            } else {
                setSelectedType("HBL"); // Default
            }
        } else {
            setSelectedType("");
        }
    }, [selectedJob]);

    // Master Charges formatted for SearchableDropdown
    const chargeDropdownOptions = useMemo(() => {
        return masterCharges.map(c => ({
            value: c.name,
            name: c.name,
            label: c.name,
            sac: c.sac || "",
            cur: c.currency || "INR"
        }));
    }, [masterCharges]);

    // FC Charges Handlers
    const handleAddCharge = () => {
        setFcCharges(prev => [
            ...prev,
            { description: "", sac: "996511", cur: "INR", rate: "", amount: "" }
        ]);
    };

    const handleRemoveCharge = (index) => {
        setFcCharges(prev => {
            const next = prev.filter((_, i) => i !== index);
            return next.length > 0 ? next : [{ description: "", sac: "996511", cur: "INR", rate: "", amount: "" }];
        });
    };

    const handleChargeChange = (index, field, value) => {
        setFcCharges(prev => {
            const next = [...prev];
            const updated = { ...next[index], [field]: value };

            // Auto-sync SAC and Currency when description is selected or matched
            if (field === 'description') {
                const matched = masterCharges.find(
                    c => (c.name || '').toLowerCase().trim() === (value || '').toLowerCase().trim() ||
                         (c.short_name && c.short_name.toLowerCase().trim() === (value || '').toLowerCase().trim())
                );
                if (matched) {
                    if (matched.sac) updated.sac = matched.sac;
                    if (matched.currency) updated.cur = matched.currency;
                }
            }

            if (field === 'rate') {
                if (!updated.amount || updated.amount === prev[index].rate) {
                    updated.amount = value;
                }
            }
            next[index] = updated;
            return next;
        });
    };

    const handleGeneratePreview = async () => {
        if (!selectedJob || !selectedType) return;
        setLoading(true);

        try {
            // 1. Determine which template to use
            let templatePath = "";
            let templateKey = ""; // internal key for data mapping logic

            if (activeTab === "DO") {
                // DO always uses do_hbl.html for now (as per requirement/limitations)
                // Whether HBL or MBL is selected, the DO structure is the same currently.
                // We might want to pass different data if MBL is selected? 
                // For now, using do_hbl.html for both.
                templatePath = '/pdf-static/do_hbl.html';
                templateKey = "do_hbl";

            } else if (activeTab === "FC") {
                if (selectedType === "HBL") {
                    templatePath = '/pdf-static/fc_hbl.html';
                    templateKey = "fc_hbl";
                } else if (selectedType === "MBL") {
                    templatePath = '/pdf-static/fc_mbl.html';
                    templateKey = "fc_mbl";
                }
            } else if (activeTab === "CAN") {
                templatePath = '/pdf-static/can_hbl.html';
                templateKey = "can_hbl";
            }

            if (!templatePath) throw new Error("No template found for selection");

            // 2. Fetch the HTML template
            const response = await fetch(templatePath);
            if (!response.ok) throw new Error(`Failed to load template: ${templatePath}`);
            let template = await response.text();

            // 3. Prepare Data Map based on template type
            let data = {};
            const formatDate = (dateVal) => {
                if (!dateVal) return "-";
                const d = new Date(dateVal);
                if (isNaN(d.getTime())) return "-";
                return d.toLocaleDateString('en-GB');
            };
            const formatCleanDate = (dateVal) => {
                if (!dateVal) return "";
                const d = new Date(dateVal);
                if (isNaN(d.getTime())) return "";
                return d.toLocaleDateString('en-GB');
            };
            const todayStr = new Date().toLocaleDateString('en-GB');

            // Parse additional_details from Sea Master BL
            let addDetails = {};
            if (selectedJob.additional_details) {
                try {
                    addDetails = typeof selectedJob.additional_details === 'string'
                        ? JSON.parse(selectedJob.additional_details)
                        : (selectedJob.additional_details || {});
                } catch (e) {
                    addDetails = {};
                }
            }

            const currentUpdate = bookingUpdates.find(u => String(u.job_no) === String(selectedJob.job_no));

            const currentShipperName = selectedType === 'MBL'
                ? (selectedJob.shipper_name || addDetails.shipper || "-")
                : (selectedJob.hbl_shipper_name || addDetails.hbl_shipper || selectedJob.shipper_name || addDetails.shipper || "-");
            const currentShipperAddress = selectedType === 'MBL'
                ? (selectedJob.shipper_address || addDetails.shipper_address || "-")
                : (selectedJob.hbl_shipper_address || addDetails.hbl_shipper_address || selectedJob.shipper_address || addDetails.shipper_address || "-");
            const currentConsigneeName = selectedType === 'MBL'
                ? (selectedJob.consignee_name || addDetails.consignee || "-")
                : (selectedJob.hbl_consignee_name || addDetails.hbl_consignee || selectedJob.consignee_name || addDetails.consignee || "-");
            const currentConsigneeAddress = selectedType === 'MBL'
                ? (selectedJob.consignee_address || addDetails.consignee_address || "-")
                : (selectedJob.hbl_consignee_address || addDetails.hbl_consignee_address || selectedJob.consignee_address || addDetails.consignee_address || "-");
            const currentNotify = selectedType === 'MBL'
                ? (selectedJob.notify || addDetails.notify || selectedJob.consignee_name || "-")
                : (selectedJob.hbl_notify || addDetails.hbl_notify || selectedJob.hbl_consignee_name || selectedJob.consignee_name || "-");
            const currentCarrier = selectedType === 'MBL'
                ? (selectedJob.carrier || addDetails.carrier || selectedJob.shipping_line_name || addDetails.shipping_line_name || "-")
                : (selectedJob.hbl_carrier || addDetails.hbl_carrier || selectedJob.shipping_line_name || addDetails.shipping_line_name || "-");
            const currentTransporter = selectedType === 'MBL'
                ? (selectedJob.transporter || addDetails.transporter || "-")
                : (selectedJob.hbl_transporter || addDetails.hbl_transporter || "-");
            const currentCHA = selectedType === 'MBL'
                ? (selectedJob.cha_name || addDetails.cha_name || "-")
                : (selectedJob.hbl_cha_name || addDetails.hbl_cha_name || "-");

            // Extract container numbers
            let containerNumbers = "";
            if (addDetails.containers && Array.isArray(addDetails.containers) && addDetails.containers.length > 0) {
                containerNumbers = addDetails.containers
                    .map(c => typeof c === 'string' ? c : (c.container_no || c.containerNo || c.container_number || ''))
                    .filter(Boolean)
                    .join(', ');
            }
            if (!containerNumbers) {
                containerNumbers = selectedJob.container_number || currentUpdate?.container_no || "-";
            }

            const hblNo = selectedJob.hbl_no || addDetails.hbl_no || currentUpdate?.hbl || "-";
            const hblDate = formatCleanDate(selectedJob.hbl_date || addDetails.hbl_date);
            const mblNo = selectedJob.mbl_no || addDetails.mbl_no || currentUpdate?.mbl || "-";
            const mblDate = formatCleanDate(selectedJob.mbl_date || addDetails.mbl_date);
            const igmNo = addDetails.igm_no || selectedJob.igm_no || currentUpdate?.igm || "-";
            const igmDate = formatCleanDate(addDetails.igm_date || addDetails.igm_on || selectedJob.igm_date || selectedJob.igm_on);
            const etaDate = formatCleanDate(selectedJob.eta || addDetails.eta || addDetails.eta_date);

            const itemNo = addDetails.item_no || addDetails.line_no || addDetails.line || selectedJob.line_no || selectedJob.line || "";
            const subNo = addDetails.sub_no || addDetails.sub_line_no || selectedJob.sub_line_no || "";
            let lineItemStr = "-";
            if (itemNo && subNo) {
                lineItemStr = `${itemNo} / ${subNo}`;
            } else if (itemNo) {
                lineItemStr = itemNo;
            } else if (subNo) {
                lineItemStr = subNo;
            }

            let igmNoDateStr = "-";
            if (igmNo && igmNo !== '-' && igmDate && igmDate !== '-') {
                igmNoDateStr = `${igmNo} / ${igmDate}`;
            } else if (igmNo && igmNo !== '-') {
                igmNoDateStr = `${igmNo} / -`;
            } else if (igmDate && igmDate !== '-') {
                igmNoDateStr = `- / ${igmDate}`;
            } else {
                igmNoDateStr = "-";
            }

            // In Sea Master BL / CAN Copy, Line refers to the Shipping Line / Carrier name
            const lineShippingLine = (selectedType === 'MBL' 
                ? (addDetails.carrier || selectedJob.carrier) 
                : (addDetails.hbl_carrier || selectedJob.hbl_carrier || addDetails.carrier || selectedJob.carrier)) 
                || currentUpdate?.shipping_line 
                || selectedJob.shipping_line_name 
                || addDetails.shipping_line_name 
                || "-";

            let canLineItemStr = "-";
            if (lineShippingLine && lineShippingLine !== '-' && itemNo) {
                canLineItemStr = `${lineShippingLine} / ${itemNo}`;
            } else if (lineShippingLine && lineShippingLine !== '-') {
                canLineItemStr = lineShippingLine;
            } else if (itemNo) {
                canLineItemStr = itemNo;
            }

            const pkgsVal = addDetails.no_of_packages || selectedJob.no_of_packages || (addDetails.containers && addDetails.containers[0]?.no_of_packages) || addDetails.no_of_palette || selectedJob.no_of_palette || "-";
            const vesselVal = selectedJob.shipping_line_name || addDetails.shipping_line_name || selectedJob.vessel_name || "-";
            const voyageVal = addDetails.voyage || selectedJob.voyage || "-";
            const carrierVal = addDetails.carrier || selectedJob.shipping_line_name || "-";

            if (templateKey === 'do_hbl') {
                data = {
                    'TO_PARTY': addDetails.cfs || selectedJob.cfs_name || selectedJob.cfs || currentUpdate?.cfs || "BUDGET CFS TERMINALS PRIVATE LIMITED",
                    'DO_NO': addDetails.do_number || selectedJob.do_number || selectedJob.mbl_no || addDetails.mbl_no || "-",
                    'DO_DATE': todayStr,
                    'HBL_NO': hblNo,
                    'HBL_DATE': hblDate || "-",
                    'MBL_NO': mblNo,
                    'MBL_DATE': mblDate || "-",
                    'CONTAINER_NO': containerNumbers,
                    'MBL_CONSIGNEE': "SSR LOGISTIC SOLUTIONS PVT. LTD.",
                    'HBL_CONSIGNEE': currentConsigneeName,
                    'NOTIFY_PARTY': currentNotify,
                    'CHA': currentCHA,
                    'CARGO_DESCRIPTION': addDetails.description || selectedJob.cargo_type || selectedJob.description || "-",
                    'DELIVERY_TYPE': addDetails.delivery_type || selectedJob.delivery_type || "Full",
                    'NO_OF_PACKAGES': String(pkgsVal !== '-' ? pkgsVal : (selectedJob.no_of_packages || "0")),
                    'MEASUREMENT': addDetails.volume || addDetails.measurement || selectedJob.measurement || "-",
                    'GROSS_WEIGHT': String(selectedJob.gross_weight || addDetails.gross_weight || "-"),
                    'VESSEL_VOYAGE': `${vesselVal !== '-' ? vesselVal : carrierVal} / ${voyageVal}`,
                    'IGM_NO': igmNo,
                    'IGM_DATE': igmDate || "-",
                    'IGM_NO_DATE': igmNoDateStr,
                    'LINE_NO': itemNo || "-",
                    'SUB_LINE_NO': subNo || "-",
                    'MARKS_AND_NOS': selectedJob.marks_and_numbers || addDetails.marks_and_numbers || selectedJob.marks_nos || "-",
                    'VALID_TILL': formatCleanDate(addDetails.do_validity || selectedJob.do_validity || addDetails.validity || selectedJob.validity) || "-",
                    'REMARKS': addDetails.remarks || currentUpdate?.remarks || selectedJob.remarks || "-",
                };
            } else if (templateKey === 'can_hbl') {
                data = {
                    'DOC_TYPE': selectedType || "HBL",
                    'SHIPPER': currentShipperName,
                    'CONSIGNEE': currentConsigneeName,
                    'CONSIGNEE_ADDRESS': currentConsigneeAddress,
                    'HBL_NO': hblNo,
                    'HBL_DATE': hblDate ? ` / ${hblDate}` : "",
                    'MBL_NO': mblNo,
                    'MBL_DATE': mblDate ? ` / ${mblDate}` : "",
                    'IGM_NO': igmNo,
                    'IGM_DATE': igmDate ? ` / ${igmDate}` : "",
                    'IGM_NO_DATE': igmNoDateStr,
                    'FPD': selectedJob.final_pod || addDetails.final_pod || addDetails.fpd || "-",
                    'PKGS': String(pkgsVal),
                    'POL': selectedJob.pol || addDetails.pol || "-",
                    'CNT_NO': containerNumbers,
                    'EX_NO': addDetails.ex_rate || addDetails.exchange_rate || selectedJob.exchange_rate || "-",
                    'JOB_NO': String(selectedJob.job_no || "-"),
                    'VESSEL_NAME': vesselVal,
                    'VOYAGE': voyageVal,
                    'LINE_ITEAM': canLineItemStr,
                    'ETA_DATE': etaDate || "-",
                    'GR_WHT': String(selectedJob.gross_weight || addDetails.gross_weight || "-"),
                    'CBM': addDetails.volume || addDetails.measurement || selectedJob.volume || selectedJob.measurement || "-",
                    'POD': selectedJob.pod || addDetails.pod || "-",
                    'CFS': addDetails.cfs || selectedJob.cfs_name || selectedJob.cfs || "-",
                };
            } else if (templateKey === 'fc_hbl' || templateKey === 'fc_mbl') {
                let chargesRowsHtml = "";
                let totalChargesSum = 0;

                const validCharges = fcCharges.filter(c => (c.description && c.description.trim()) || c.rate || c.amount);

                if (validCharges.length > 0) {
                    chargesRowsHtml = validCharges.map((c, idx) => {
                        const amt = parseFloat(c.amount || c.rate || 0);
                        totalChargesSum += isNaN(amt) ? 0 : amt;
                        const rateVal = c.rate ? (isNaN(parseFloat(c.rate)) ? c.rate : parseFloat(c.rate).toFixed(2)) : "-";
                        const amtVal = isNaN(amt) ? "0.00" : amt.toFixed(2);
                        return `
                        <tr>
                            <td style="text-align: center;">${idx + 1}</td>
                            <td>${c.description || "-"}</td>
                            <td style="text-align: center;">${c.sac || "-"}</td>
                            <td style="text-align: center;">${c.cur || "INR"}</td>
                            <td style="text-align: right;">${rateVal}</td>
                            <td style="text-align: right;">${amtVal}</td>
                        </tr>`;
                    }).join("");
                } else {
                    chargesRowsHtml = `<tr><td colspan="6" style="text-align:center; color:#555; padding: 4px;">No charges available</td></tr>`;
                }

                const totalAmountFormatted = totalChargesSum > 0 ? totalChargesSum.toFixed(2) : "0.00";
                const totalAmountInWords = totalChargesSum > 0 ? numberToWordsINR(totalChargesSum) : "Zero Rupees Only";

                if (templateKey === 'fc_hbl') {
                    data = {
                        'KYCList.shipper_name': currentShipperName,
                        'KYCList.shipper_address': currentShipperAddress,
                        'IGM.cfs_name': addDetails.cfs || selectedJob.cfs_name || selectedJob.cfs || "-",
                        'other.date': todayStr,
                        'KYCList.consignee_name': currentConsigneeName,
                        'KYCList.consignee_address': currentConsigneeAddress,
                        'IGM.vessel_name': vesselVal,
                        'IGM.vessel_voyage': voyageVal,
                        'BookingList.hbl_no': hblNo,
                        'IGM.igm_no': igmNo,
                        'BookingList.mbl_no': mblNo,
                        'IGM.igm_date': igmDate || "-",
                        'IGM.igm_no_date': igmNoDateStr,
                        'BookingList.bl_date': hblDate || "-",
                        'IGM.line_no': lineItemStr,
                        'BookingList.mode': addDetails.shipment_type || selectedJob.booking_type || "FCL",
                        'BookingList.eta': etaDate || "-",
                        'BookingList.container_type': selectedJob.container_size || addDetails.inv_csize || addDetails.container_size || "-",
                        'BookingList.pol': selectedJob.pol || addDetails.pol || "-",
                        'carrier.name': carrierVal,
                        'BookingList.pod': selectedJob.pod || addDetails.pod || "-",
                        'BookingList.container_count': String(selectedJob.container_count || addDetails.inv_no_of_units || "1"),
                        'booking.exchange_rate': addDetails.ex_rate || addDetails.exchange_rate || selectedJob.exchange_rate || "—",
                        'cargo.weight': String(selectedJob.gross_weight || addDetails.gross_weight || "-"),
                        'charges.rows': chargesRowsHtml,
                        'charges.total_amount': totalAmountFormatted,
                        'other.rupees_in_words': totalAmountInWords,
                        'user.name': "System User",
                    };
                } else if (templateKey === 'fc_mbl') {
                    data = {
                        'mbl.shipper_name': currentShipperName,
                        'mbl.shipper_address': currentShipperAddress,
                        'igm.cfs_name': addDetails.cfs || selectedJob.cfs_name || selectedJob.cfs || "-",
                        'other.date': todayStr,
                        'mbl.consignee_name': currentConsigneeName,
                        'mbl.consignee_address': currentConsigneeAddress,
                        'vessel.name': vesselVal,
                        'vessel.voyage': voyageVal,
                        'booking.hbl_no': hblNo,
                        'igm.no': igmNo,
                        'booking.mbl_no': mblNo,
                        'igm.date': igmDate || "-",
                        'igm.no_date': igmNoDateStr,
                        'IGM.igm_no_date': igmNoDateStr,
                        'booking.bl_date': mblDate || "-",
                        'igm.line_no': lineItemStr,
                        'booking.mode': addDetails.shipment_type || selectedJob.booking_type || "FCL",
                        'booking.eta': etaDate || "-",
                        'booking.container_size': selectedJob.container_size || addDetails.inv_csize || addDetails.container_size || "-",
                        'booking.pol': selectedJob.pol || addDetails.pol || "-",
                        'carrier.name': carrierVal,
                        'booking.pod': selectedJob.pod || addDetails.pod || "-",
                        'booking.no_containers': String(selectedJob.container_count || addDetails.inv_no_of_units || "1"),
                        'booking.exchange_rate': addDetails.ex_rate || addDetails.exchange_rate || selectedJob.exchange_rate || "—",
                        'cargo.weight': String(selectedJob.gross_weight || addDetails.gross_weight || "-"),
                        'charges.rows': chargesRowsHtml,
                        'charges.total_amount': totalAmountFormatted,
                        'other.rupees_in_words': totalAmountInWords,
                    };
                }
            }

            // 4. Inject Data
            // Replace {{ key }}
            let htmlContent = template.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (match, key) => {
                return data[key] !== undefined ? data[key] : "";
            });

            // 5. Handle Loops (Quick Fix for Charges)
            // Remove the Jinja loop block for now or replace with static "No Charges" row since we don't have charge data in this view yet
            const emptyChargeRow = `<tr><td colspan="4" style="text-align:center;">No charges available</td></tr>`;

            // Regex to find the loop block: {% for ... %} ... {% endfor %}
            // This is a simple regex assumption, might need tweaking if nested or complex
            htmlContent = htmlContent.replace(/\{%\s*for\s+charge\s+in\s+charges\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g, emptyChargeRow);
            // Set dynamic filename in HTML title for PDF download naming: Filename_Job No._ HBL/MBL
            let docNamePrefix = "Document";
            if (activeTab === "DO") docNamePrefix = "Delivery_Order";
            else if (activeTab === "FC") docNamePrefix = "Freight_Certificate";
            else if (activeTab === "CAN") docNamePrefix = "CAN_Copy";

            const dynamicFilename = `${docNamePrefix}_${selectedJob?.job_no || 'SSR'}_${selectedType || 'HBL'}`;
            htmlContent = htmlContent.replace(/<title>[\s\S]*?<\/title>/i, `<title>${dynamicFilename}</title>`);

            setPreviewData(htmlContent);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate preview");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        let docNamePrefix = "Document";
        if (activeTab === "DO") docNamePrefix = "Delivery_Order";
        else if (activeTab === "FC") docNamePrefix = "Freight_Certificate";
        else if (activeTab === "CAN") docNamePrefix = "CAN_Copy";

        const dynamicFilename = `${docNamePrefix}_${selectedJob?.job_no || 'SSR'}_${selectedType || 'HBL'}`;

        const iframe = document.getElementById('do-preview-frame');
        if (iframe) {
            try {
                if (iframe.contentDocument) {
                    iframe.contentDocument.title = dynamicFilename;
                }
            } catch (e) {
                console.error("Could not set iframe title:", e);
            }

            const originalTitle = document.title;
            document.title = dynamicFilename;

            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            setTimeout(() => {
                document.title = originalTitle;
            }, 1000);
        }
    };

    const getBase64ImageFromUrl = async (imageUrl) => {
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve('');
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error('Failed to convert image to base64', e);
            return '';
        }
    };

    const handleDownloadWord = async () => {
        if (!previewData) return;
        try {
            setLoading(true);
            const [logoBase64, stampBase64] = await Promise.all([
                getBase64ImageFromUrl('/images/SSR_nobg.png'),
                getBase64ImageFromUrl('/images/ssr_stamp_signature.png')
            ]);

            let processedHtml = previewData;

            if (logoBase64) {
                processedHtml = processedHtml.replace(/<img[^>]*src=["'][^"']*(?:SSR_Logo|SSR_nobg|logo_Gh)[^"']*["'][^>]*>/gi, `<img src="${logoBase64}" alt="SSR Logo" width="110" style="width: 110px; max-width: 110px; height: auto; display: block;" />`);
            }
            if (stampBase64) {
                processedHtml = processedHtml.replace(/<img[^>]*src=["'][^"']*ssr_stamp_signature[^"']*["'][^>]*>/gi, `<img src="${stampBase64}" alt="Stamp and signature" width="80" style="width: 80px; max-width: 80px; height: auto; display: block;" />`);
            }

            const htmlDoc = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' 
                      xmlns:w='urn:schemas-microsoft-com:office:word' 
                      xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset='utf-8'>
                    <title>Freight Certificate</title>
                    <!--[if gte mso 9]>
                    <xml>
                        <w:WordDocument>
                            <w:View>Print</w:View>
                            <w:Zoom>100</w:Zoom>
                            <w:DoNotOptimizeForBrowser/>
                        </w:WordDocument>
                    </xml>
                    <![endif]-->
                    <style>
                        @page Section1 {
                            size: 595.3pt 841.9pt;
                            margin: 12pt 18pt 12pt 18pt;
                            mso-header-margin: 0pt;
                            mso-footer-margin: 0pt;
                            mso-paper-source: 0;
                        }
                        div.Section1 {
                            page: Section1;
                        }
                        * { box-sizing: border-box; }
                        body {
                            font-family: Calibri, Arial, sans-serif;
                            font-size: 8.5pt;
                            color: #000;
                            line-height: 1.15;
                            margin: 0;
                            padding: 0;
                        }
                        .page {
                            width: 100% !important;
                            border: 1.5pt solid #000 !important;
                            padding: 6pt 8pt !important;
                            margin: 0 !important;
                            box-sizing: border-box;
                        }
                        table {
                            border-collapse: collapse;
                            width: 100%;
                            margin-bottom: 3pt;
                            font-size: 8.5pt;
                        }
                        th, td {
                            border: 1pt solid #000;
                            padding: 2pt 4pt;
                            vertical-align: top;
                            line-height: 1.15;
                        }
                        th {
                            background-color: #f2f2f2;
                            font-weight: bold;
                        }
                        .header-table {
                            width: 100%;
                            border: none !important;
                            border-bottom: 1pt solid #000 !important;
                            margin-bottom: 3pt !important;
                            padding-bottom: 2pt !important;
                        }
                        .header-table td {
                            border: none !important;
                            padding: 0 2pt !important;
                        }
                        .company-title {
                            font-size: 11pt;
                            font-weight: bold;
                            margin-bottom: 1pt;
                        }
                        .company-details {
                            font-size: 7.5pt;
                            line-height: 1.15;
                        }
                        .doc-title {
                            text-align: center;
                            font-weight: bold;
                            font-size: 11pt;
                            background: #f2f2f2;
                            border: 1pt solid #000;
                            padding: 2pt;
                            margin: 3pt 0;
                            letter-spacing: 0.5pt;
                        }
                        .footer-note {
                            font-size: 7.5pt;
                            line-height: 1.15;
                            border: 1pt solid #000;
                            padding: 3pt 5pt;
                            margin-top: 3pt;
                        }
                        .sign-box {
                            margin-top: 3pt;
                            font-size: 8pt;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                        }
                    </style>
                </head>
                <body>
                    <div class="Section1">
                        ${processedHtml}
                    </div>
                </body>
                </html>
            `;
            const blob = new Blob(['\ufeff', htmlDoc], {
                type: 'application/msword;charset=utf-8'
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = `Freight_Certificate_${selectedJob?.job_no || 'SSR'}_${selectedType || 'HBL'}.doc`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error generating Word document:', err);
            toast.error('Failed to generate Word document');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout title="Documents (DO / FC / CAN)">
            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => { setActiveTab("DO"); setPreviewData(null); }}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === "DO"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                >
                    Delivery Order
                    {activeTab === "DO" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />}
                </button>
                <button
                    onClick={() => { setActiveTab("FC"); setPreviewData(null); }}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === "FC"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                >
                    Freight Certificate
                    {activeTab === "FC" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />}
                </button>
                <button
                    onClick={() => { setActiveTab("CAN"); setPreviewData(null); }}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === "CAN"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                >
                    CAN Copy
                    {activeTab === "CAN" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />}
                </button>
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-end">
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Job</label>
                        {/* Searchable Input */}
                        <div className="relative" ref={jobWrapperRef}>
                            <input
                                type="text"
                                placeholder="Type Job No, Shipper, MBL or HBL..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsDropdownOpen(true);
                                    setActiveIndex(-1);
                                    if (e.target.value === "") setSelectedJobNo("");
                                }}
                                onFocus={() => {
                                    setIsDropdownOpen(true);
                                    setActiveIndex(-1);
                                }}
                                onKeyDown={(e) => {
                                    if (!isDropdownOpen) {
                                        if (e.key === 'ArrowDown' || e.key === 'Enter') {
                                            setIsDropdownOpen(true);
                                        }
                                        return;
                                    }
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
                                    } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (activeIndex >= 0 && filteredOptions[activeIndex]) {
                                            handleSelectJob(filteredOptions[activeIndex]);
                                        }
                                    } else if (e.key === 'Escape') {
                                        setIsDropdownOpen(false);
                                        setActiveIndex(-1);
                                    }
                                }}
                                className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                                <Search size={16} />
                            </div>

                            {/* Dropdown Options */}
                            {isDropdownOpen && (
                                <div
                                    ref={listRef}
                                    className="absolute z-30 w-full mt-1 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                                >
                                    {filteredOptions.length > 0 ? (
                                        filteredOptions.map((job, idx) => (
                                            <div
                                                key={job.job_no}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleSelectJob(job);
                                                }}
                                                className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
                                                    activeIndex === idx
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                                                }`}
                                            >
                                                <div className="font-medium">#{job.job_no}</div>
                                                {job.shipper_name && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{job.shipper_name}</div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-slate-500 text-center">No jobs found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Document Type</label>
                        <select
                            value={selectedType}
                            onChange={(e) => {
                                setSelectedType(e.target.value);
                                setPreviewData(null);
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            disabled={!selectedJobNo}
                        >
                            {/* HBL is default options logic ensures HBL is first/selected */}
                            {!selectedType && <option value="">-- Select --</option>}
                            {typeOptions.map(opt => (
                                <option key={opt.value} value={opt.value} disabled={opt.disabled} className={opt.disabled ? "text-slate-400 italic" : ""}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleGeneratePreview}
                        disabled={!selectedJobNo || !selectedType}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                        <Search size={18} /> Generate Preview
                    </button>
                </div>

                {/* FC Charges Form (Only visible for Freight Certificate) */}
                {activeTab === "FC" && (
                    <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <span>Service Charges / Line Items</span>
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Add items below to populate the service charges table in the Freight Certificate.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddCharge}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800"
                            >
                                <Plus size={14} /> Add Charge Row
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                                <thead className="text-[11px] uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-3 py-2 w-12 text-center">S/N</th>
                                        <th className="px-3 py-2 min-w-[220px]">Service Charge Description</th>
                                        <th className="px-3 py-2 w-28">SAC</th>
                                        <th className="px-3 py-2 w-24">CUR</th>
                                        <th className="px-3 py-2 w-32 text-right">Rate Per Unit</th>
                                        <th className="px-3 py-2 w-36 text-right">Total Amount</th>
                                        <th className="px-3 py-2 w-12 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 bg-white dark:bg-dark-card">
                                    {fcCharges.map((charge, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <td className="px-3 py-2 text-center font-medium text-slate-500">{idx + 1}</td>
                                            <td className="px-3 py-2 min-w-[240px]">
                                                <SearchableDropdown
                                                    options={chargeDropdownOptions}
                                                    value={charge.description}
                                                    valueKey="name"
                                                    labelKey="label"
                                                    onChange={(val) => handleChargeChange(idx, "description", val)}
                                                    placeholder="Search or select charge..."
                                                    allowCustom={false}
                                                    variant="grid"
                                                    className="w-full text-xs"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    placeholder="996511"
                                                    value={charge.sac}
                                                    onChange={(e) => handleChargeChange(idx, "sac", e.target.value)}
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={charge.cur}
                                                    onChange={(e) => handleChargeChange(idx, "cur", e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                >
                                                    <option value="INR">INR</option>
                                                    <option value="USD">USD</option>
                                                    <option value="EUR">EUR</option>
                                                    <option value="AED">AED</option>
                                                    <option value="GBP">GBP</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={charge.rate}
                                                    onChange={(e) => handleChargeChange(idx, "rate", e.target.value)}
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-right"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={charge.amount}
                                                    onChange={(e) => handleChargeChange(idx, "amount", e.target.value)}
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none text-right"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCharge(idx)}
                                                    disabled={fcCharges.length === 1 && !charge.description && !charge.rate && !charge.amount}
                                                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-30"
                                                    title="Remove Row"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 font-semibold">
                                    <tr>
                                        <td colSpan={5} className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">
                                            Total Amount:
                                        </td>
                                        <td className="px-3 py-2.5 text-right text-indigo-600 dark:text-indigo-400 text-sm">
                                            ₹{fcCharges.reduce((sum, c) => sum + (parseFloat(c.amount || c.rate) || 0), 0).toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Area */}
            {previewData ? (
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 overflow-x-auto">
                    <div className="flex justify-between items-center mb-4 px-4">
                        <h3 className="font-bold text-slate-700">Document Preview</h3>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
                            >
                                <Printer size={16} /> Print / Save PDF
                            </button>
                        </div>
                    </div>

                    <div className="border border-slate-300 bg-gray-50 flex justify-center p-4">
                        <iframe
                            id="do-preview-frame"
                            srcDoc={previewData}
                            title="DO Preview"
                            className="bg-white shadow-xl"
                            style={{ width: '815px', height: activeTab === 'DO' ? '1123px' : '1000px', border: 'none' }} // A4 height for DO, adjusted for FC content
                        />
                    </div>
                </div>
            ) : (
                !loading && (
                    <div className="text-center py-20 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Select a Job and Document Type to generate a preview.</p>
                    </div>
                )
            )}
        </DashboardLayout>
    );
};

export default DOFC;
