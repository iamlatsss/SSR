import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Plus, Search, ArrowUpDown, Filter, Eye, Copy, Clipboard, 
    Trash2, RefreshCw, Download, Upload, EyeOff, Save, CheckCircle,
    ChevronDown, ChevronUp, Lock, Unlock, Settings, X
} from 'lucide-react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import PortSelect from '../components/PortSelect';
import { useAuth } from '../context/AuthContext';

const ALL_COLUMNS = [
    { key: 'date_of_nomination', label: 'Date of Nomination', type: 'date', width: 90 },
    { key: 'consignee', label: 'Consignee', type: 'text', width: 135 },
    { key: 'job_no', label: 'Job No.', type: 'text', width: 58 },
    { key: 'hbl', label: 'HBL', type: 'text', width: 130 },
    { key: 'mbl', label: 'MBL', type: 'text', width: 130 },
    { key: 'pol', label: 'POL', type: 'text', width: 70 },
    { key: 'pod', label: 'POD', type: 'text', width: 85 },
    { key: 'container_size', label: 'Cntr Size', type: 'text', width: 70 },
    { key: 'teus', label: 'TEUs', type: 'number', width: 45 },
    { key: 'agent', label: 'Agent', type: 'text', width: 95 },
    { key: 'shipping_line', label: 'S/L Line', type: 'text', width: 75 },
    { key: 'freight', label: 'Buy/Sell', type: 'text', width: 80 },
    { key: 'etd', label: 'ETD', type: 'date', width: 88 },
    { key: 'eta', label: 'ETA', type: 'date', width: 88 },
    { key: 'swb', label: 'SWB', type: 'text', width: 45 },
    { key: 'igm', label: 'IGM', type: 'text', width: 50 },
    { key: 'invoice_amount', label: 'Invoice Amount', type: 'number', width: 95 },
    { key: 'cha', label: 'CHA', type: 'text', width: 65 },
    { key: 'cfs', label: 'CFS', type: 'text', width: 65 },
    { key: 'container_no', label: 'Container No.', type: 'text', width: 110 },
    { key: 'remarks', label: 'Remarks', type: 'longtext', width: 130 },
    { key: 'status', label: 'Status', type: 'text', width: 80 }
];

// Columns to be displayed in the main table grid
const DISPLAY_COLUMNS_KEYS = [
    'date_of_nomination', 'consignee', 'job_no', 'hbl', 'mbl',
    'pol', 'pod', 'container_size', 'teus', 'agent', 'shipping_line',
    'freight', 'etd', 'eta', 'swb', 'igm', 'remarks'
];

const INITIAL_FORM_STATE = {
    date_of_nomination: '', consignee: '', job_no: '', hbl: '', mbl: '',
    pol: '', pod: '', container_size: '', teus: '', agent: '', shipping_line: '',
    freight: '', etd: '', eta: '', swb: 'No', igm: 'No', invoice_amount: '',
    cha: '', cfs: '', container_no: '', remarks: '', status: 'Current'
};

const PartySelect = ({ label, value, onChange, name, parties, category, placeholder = "Search...", required = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (value) {
            const p = parties.find(x => String(x.id) === String(value) || x.name === value);
            setSearch(p ? p.name : value);
        } else {
            setSearch("");
        }
    }, [value, parties]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    let filtered = parties
        .filter(p => !category || p.category_type === category || (category === 'CHA' && (p.category_type === 'CHA' || p.category_type === 'Others')) || (category === 'CFS' && p.category_type === 'CFS'))
        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    if (filtered.length === 0 && search) {
        filtered = parties.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    const filteredOptions = filtered.slice(0, 50);

    const handleSelect = (p) => {
        setSearch(p.name);
        onChange({ target: { name, value: p.name } });
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            {label && <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">{label} {required && <span className="text-rose-500">*</span>}</label>}
            <input
                type="text"
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    onChange({ target: { name, value: e.target.value } });
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 h-8 text-slate-800 dark:text-slate-200"
            />
            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredOptions.map(p => (
                        <div
                            key={p.id}
                            onClick={() => handleSelect(p)}
                            className="px-2 py-1 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0"
                        >
                            {p.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const BookingUpdates = () => {
    const { user } = useAuth();
    const userRole = String(user?.role || user?.user_role || '').toLowerCase();
    const isDirectorOrAdmin = userRole === 'admin' || userRole === 'director';

    const allowedColumns = useMemo(() => {
        if (isDirectorOrAdmin) {
            return ALL_COLUMNS;
        }
        return ALL_COLUMNS.filter(col => col.key !== 'freight');
    }, [isDirectorOrAdmin]);

    const [rows, setRows] = useState([]);
    const [parties, setParties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Column settings: only the display columns are visible in the table grid by default
    const [visibleColumns, setVisibleColumns] = useState(() =>
        ALL_COLUMNS.reduce((acc, col) => ({ 
            ...acc, 
            [col.key]: DISPLAY_COLUMNS_KEYS.includes(col.key) && (isDirectorOrAdmin || col.key !== 'freight')
        }), {})
    );

    useEffect(() => {
        setVisibleColumns(prev => {
            const updated = { ...prev };
            if (!isDirectorOrAdmin) {
                updated.freight = false;
            }
            return updated;
        });
    }, [isDirectorOrAdmin]);
    const [showColSettings, setShowColSettings] = useState(false);
    const colSettingsRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (colSettingsRef.current && !colSettingsRef.current.contains(event.target)) {
                setShowColSettings(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const [freezeHeader, setFreezeHeader] = useState(true);
    
    // Sorting & Filtering
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filters, setFilters] = useState({});
    const [showFilterRow, setShowFilterRow] = useState(false);

    // Spreadsheet cell states
    const [selectedCell, setSelectedCell] = useState({ rowIndex: null, colKey: null });
    const gridRef = useRef(null);
    const fileInputRef = useRef(null);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedRowData, setSelectedRowData] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    // Multiselect state
    const [selectedRowIds, setSelectedRowIds] = useState(new Set());
    const [incompleteError, setIncompleteError] = useState(null);

    // Fetch initial data
    const loadData = async () => {
        try {
            setLoading(true);
            setSelectedRowIds(new Set());
            const res = await api.get('/booking-updates');
            if (res.data.success) {
                setRows(res.data.data || []);
            } else {
                toast.error(res.data.message || 'Failed to fetch bookings');
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            toast.error('Server error fetching bookings.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectRow = (id) => {
        const newSelected = new Set(selectedRowIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedRowIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedRowIds.size === filteredRows.length) {
            setSelectedRowIds(new Set());
        } else {
            setSelectedRowIds(new Set(filteredRows.map(r => r.id)));
        }
    };

    const handleDeleteSelected = async () => {
        const count = selectedRowIds.size;
        if (!window.confirm(`Are you sure you want to delete the ${count} selected records?`)) return;

        try {
            const res = await api.post('/booking-updates/delete-multiple', { ids: Array.from(selectedRowIds) });
            if (res.data.success) {
                toast.success(`${count} records deleted successfully.`);
                const remaining = rows.filter(r => !selectedRowIds.has(r.id));
                setRows(remaining);
                setSelectedRowIds(new Set());
            } else {
                toast.error(res.data.message || 'Bulk delete failed.');
            }
        } catch (error) {
            console.error('Error doing bulk delete:', error);
            toast.error('Error deleting records.');
        }
    };

    const loadParties = async () => {
        try {
            const res = await api.get('/party');
            if (res.data.success) {
                setParties(res.data.parties || []);
            }
        } catch (e) {
            console.error("Error loading parties:", e);
        }
    };

    useEffect(() => {
        loadData();
        loadParties();
    }, []);

    // Form inputs change handler for modals
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Open Add Job Modal
    const handleOpenAddModal = async () => {
        try {
            const res = await api.get('/booking-updates/next-job-no');
            const nextJob = res.data.nextJobNo || '5531';
            setFormData({
                ...INITIAL_FORM_STATE,
                job_no: nextJob
            });
        } catch (err) {
            console.error("Error getting next job number:", err);
            const jobNos = rows
                .map(r => parseInt(r.job_no, 10))
                .filter(n => !isNaN(n) && n >= 1000 && n <= 9999);
            const maxJob = jobNos.length > 0 ? Math.max(...jobNos) : 5530;
            const nextJob = String(maxJob + 1);

            setFormData({
                ...INITIAL_FORM_STATE,
                job_no: nextJob
            });
        }
        setIsAddModalOpen(true);
    };

    // Submit Add Job Form
    const handleAddJobSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/booking-updates', formData);
            if (res.data.success) {
                setRows([...rows, res.data.data]);
                toast.success('Job row added successfully.');
                setIsAddModalOpen(false);
            } else {
                const msg = res.data.message || 'Failed to add row.';
                if (msg.includes('Cannot close job')) {
                    setIncompleteError(msg);
                } else {
                    toast.error(msg);
                }
            }
        } catch (error) {
            console.error('Error adding row:', error);
            const msg = error.response?.data?.message || 'Error adding row.';
            if (msg.includes('Cannot close job')) {
                setIncompleteError(msg);
            } else {
                toast.error(msg);
            }
        }
    };

    // Open View Details Modal
    const handleOpenViewModal = (row) => {
        setSelectedRowData(row);
        setFormData({ ...row });
        setIsViewModalOpen(true);
    };

    // Save changes from View/Edit Modal
    const handleViewModalSave = async (e) => {
        e.preventDefault();
        if (!selectedRowData) return;
        try {
            const res = await api.put(`/booking-updates/${selectedRowData.id}`, formData);
            if (res.data.success) {
                const updatedRows = rows.map(r => r.id === selectedRowData.id ? res.data.data : r);
                setRows(updatedRows);
                toast.success('Row updated successfully.');
                setIsViewModalOpen(false);
            } else {
                const msg = res.data.message || 'Failed to update row.';
                if (msg.includes('Cannot close job')) {
                    setIncompleteError(msg);
                } else {
                    toast.error(msg);
                }
            }
        } catch (error) {
            console.error('Error updating row:', error);
            const msg = error.response?.data?.message || 'Error updating row.';
            if (msg.includes('Cannot close job')) {
                setIncompleteError(msg);
            } else {
                toast.error(msg);
            }
        }
    };

    // Helper to get unique values for text column dropdown filter
    const getUniqueColumnValues = (colKey) => {
        const values = rows
            .map(row => String(row[colKey] || '').trim())
            .filter(val => val !== '');
        return Array.from(new Set(values)).sort();
    };

    // Helper to get unique month-year options for date column dropdown filter
    const getUniqueDateFilterOptions = (colKey) => {
        const values = rows
            .map(row => {
                const val = row[colKey];
                if (!val) return null;
                const date = new Date(val);
                if (isNaN(date.getTime())) return null;
                const year = date.getFullYear();
                const month = date.toLocaleString('default', { month: 'long' });
                return {
                    label: `${month} ${year}`,
                    value: `${year}-${String(date.getMonth() + 1).padStart(2, '0')}` // YYYY-MM prefix
                };
            })
            .filter(Boolean);

        const uniqueMap = {};
        values.forEach(opt => {
            uniqueMap[opt.value] = opt.label;
        });

        return Object.entries(uniqueMap)
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => b.value.localeCompare(a.value)); // Descending sort
    };

    // Delete row
    const handleDeleteRow = async (id, jobNo) => {
        if (!window.confirm(`Are you sure you want to delete this row (Job No: ${jobNo || 'N/A'})?`)) return;

        try {
            const res = await api.delete(`/booking-updates/${id}`);
            if (res.data.success) {
                const updated = rows.filter(r => r.id !== id);
                setRows(updated);
                toast.success('Row deleted.');
                setSelectedCell({ rowIndex: null, colKey: null });
            } else {
                toast.error(res.data.message || 'Delete failed.');
            }
        } catch (error) {
            console.error('Error deleting row:', error);
            toast.error('Error deleting row.');
        }
    };

    // Keyboard Navigation for inline grid
    const handleKeyDown = (e, rowIndex, colKey) => {
        const colKeys = allowedColumns.filter(col => visibleColumns[col.key]).map(col => col.key);
        const colIndex = colKeys.indexOf(colKey);

        let nextRow = rowIndex;
        let nextColIdx = colIndex;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (rowIndex > 0) nextRow = rowIndex - 1;
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (rowIndex < rows.length - 1) nextRow = rowIndex + 1;
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (colIndex > 0) nextColIdx = colIndex - 1;
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (colIndex < colKeys.length - 1) nextColIdx = colIndex + 1;
                break;
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    if (colIndex > 0) {
                        nextColIdx = colIndex - 1;
                    } else if (rowIndex > 0) {
                        nextRow = rowIndex - 1;
                        nextColIdx = colKeys.length - 1;
                    }
                } else {
                    if (colIndex < colKeys.length - 1) {
                        nextColIdx = colIndex + 1;
                    } else if (rowIndex < rows.length - 1) {
                        nextRow = rowIndex + 1;
                        nextColIdx = 0;
                    }
                }
                break;
            default:
                return;
        }

        setSelectedCell({ rowIndex: nextRow, colKey: colKeys[nextColIdx] });
    };

    // Sort Handler (Ascending -> Descending -> No Sort)
    const handleSort = (key) => {
        if (sortConfig.key !== key) {
            setSortConfig({ key, direction: 'asc' });
        } else if (sortConfig.direction === 'asc') {
            setSortConfig({ key, direction: 'desc' });
        } else {
            setSortConfig({ key: null, direction: 'asc' });
        }
    };

    // Filter change handler
    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value });
    };

    // Excel Toolbar Actions
    const handleRefresh = () => {
        loadData();
    };

    // Export to Excel
    const handleExportExcel = () => {
        const headers = allowedColumns.filter(col => visibleColumns[col.key]).map(col => col.label);
        const dataRows = filteredRows.map(row => 
            allowedColumns.filter(col => visibleColumns[col.key]).map(col => row[col.key] || '')
        );

        const csvContent = [
            headers.join(','),
            ...dataRows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Booking_Updates_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Excel/CSV export completed.');
    };

    // Trigger Hidden File Input Click
    const handleUploadButtonClick = () => {
        fileInputRef.current?.click();
    };

    // Helper to format Date values from Excel
    const formatExcelDate = (val) => {
        if (val === undefined || val === null || val === '') return '';
        
        // If already a JS Date object
        if (val instanceof Date) {
            const yyyy = val.getFullYear();
            const mm = String(val.getMonth() + 1).padStart(2, '0');
            const dd = String(val.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        
        // If it's a string
        if (typeof val === 'string') {
            const dateStr = val.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
            
            // Try parsing DD-MM-YYYY or DD/MM/YYYY
            const parts = dateStr.split(/[-/]/);
            if (parts.length === 3) {
                if (parts[2].length === 4 && parts[0].length <= 2) {
                    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
                if (parts[0].length === 4) {
                    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                }
            }
            
            const parsedNum = Number(dateStr);
            if (!isNaN(parsedNum) && dateStr !== '') {
                val = parsedNum;
            } else {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                }
                return dateStr;
            }
        }
        
        // If it's a number (Excel serial date)
        if (typeof val === 'number') {
            // Excel dates start from 1899-12-30 due to a leap year bug in Lotus 1-2-3
            const date = new Date(Math.round((val - 25569) * 86400 * 1000));
            if (!isNaN(date.getTime())) {
                const yyyy = date.getUTCFullYear();
                const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(date.getUTCDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
        }
        
        return String(val);
    };

    // Upload and Parse Excel File
    const handleExcelUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const arrayBuffer = evt.target?.result;
                if (!arrayBuffer) {
                    toast.error("Could not read file data.");
                    return;
                }
                // Enable cellDates to parse date values into JS Date objects
                const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                
                // Read sheet as JSON matrix/arrays
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                if (data.length === 0) {
                    toast.error("Excel sheet is empty.");
                    return;
                }

                let headerRowIndex = 0;
                let colMap = {};

                // Find header row in first 10 rows of data
                for (let r = 0; r < Math.min(data.length, 10); r++) {
                    const row = data[r];
                    if (!row || !Array.isArray(row)) continue;

                    const tempMap = {};
                    row.forEach((cell, idx) => {
                        if (cell === undefined || cell === null || cell === '') return;
                        const normalizedCell = String(cell).trim().toLowerCase().replace(/[._\-\s]+/g, '');
                        
                        allowedColumns.forEach(col => {
                            const cleanLabel = col.label.toLowerCase().replace(/[._\-\s]+/g, '');
                            const cleanKey = col.key.toLowerCase().replace(/[._\-\s]+/g, '');
                            if (normalizedCell === cleanLabel || normalizedCell === cleanKey || 
                                (col.key === 'container_size' && normalizedCell === 'containersize') ||
                                (col.key === 'ref_no' && (normalizedCell === 'ref' || normalizedCell === 'refno'))
                            ) {
                                tempMap[col.key] = idx;
                            }
                        });
                    });

                    // If we match at least 3 columns, we've found the header row!
                    if (Object.keys(tempMap).length >= 3) {
                        colMap = tempMap;
                        headerRowIndex = r;
                        break;
                    }
                }

                // Fallback to first row mapping if no multi-match header was found
                if (Object.keys(colMap).length === 0 && data.length > 0) {
                    const firstRow = data[0];
                    if (Array.isArray(firstRow)) {
                        firstRow.forEach((cell, idx) => {
                            if (cell === undefined || cell === null || cell === '') return;
                            const normalizedCell = String(cell).trim().toLowerCase().replace(/[._\-\s]+/g, '');
                            allowedColumns.forEach(col => {
                                const cleanLabel = col.label.toLowerCase().replace(/[._\-\s]+/g, '');
                                const cleanKey = col.key.toLowerCase().replace(/[._\-\s]+/g, '');
                                if (normalizedCell === cleanLabel || normalizedCell === cleanKey || 
                                    (col.key === 'container_size' && normalizedCell === 'containersize') ||
                                    (col.key === 'ref_no' && (normalizedCell === 'ref' || normalizedCell === 'refno'))
                                ) {
                                    colMap[col.key] = idx;
                                }
                            });
                        });
                    }
                }

                if (Object.keys(colMap).length === 0) {
                    toast.error("Could not match any columns. Please make sure the Excel file contains matching headers (e.g. 'Job No.', 'Consignee', etc.)");
                    return;
                }

                const dataRows = data.slice(headerRowIndex + 1);
                
                // Calculate next 4-digit sequential job number
                const jobNos = rows
                    .map(r => parseInt(r.job_no, 10))
                    .filter(n => !isNaN(n) && n >= 1000 && n <= 9999);
                let nextJob = jobNos.length > 0 ? Math.max(...jobNos) + 1 : 1000;

                const parsedRows = dataRows.map(row => {
                    if (!row || !Array.isArray(row)) return null;
                    const parsedRow = {};
                    let hasValue = false;
                    allowedColumns.forEach(col => {
                        const idx = colMap[col.key];
                        if (idx !== undefined && row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
                            let cellVal = row[idx];
                            // Parse dates & checkbox fields correctly
                            if (col.type === 'date') {
                                cellVal = formatExcelDate(cellVal);
                            } else if (col.key === 'swb' || col.key === 'igm') {
                                const cleanVal = String(cellVal).trim().toUpperCase();
                                if (['Y', 'YES', 'TRUE', '1'].includes(cleanVal)) {
                                    cellVal = 'Yes';
                                } else {
                                    cellVal = 'No';
                                }
                            } else {
                                cellVal = String(cellVal).trim();
                            }
                            parsedRow[col.key] = cellVal;
                            hasValue = true;
                        }
                    });
                    
                    if (!hasValue) return null;

                    // Generate sequential 4-digit job number if missing
                    if (!parsedRow.job_no) {
                        parsedRow.job_no = String(nextJob++);
                    }
                    return parsedRow;
                }).filter(Boolean);

                if (parsedRows.length === 0) {
                    toast.warning("No valid data rows found in the uploaded Excel file.");
                    return;
                }

                // Save to database in bulk
                const res = await api.post('/booking-updates/bulk', { rows: parsedRows });
                if (res.data.success) {
                    toast.success(`${res.data.data.length} rows successfully uploaded and updated from Excel.`);
                    loadData();
                } else {
                    toast.error(res.data.message || 'Import failed.');
                }
            } catch (err) {
                console.error("Excel Upload Error:", err);
                toast.error("Failed to read Excel file. Make sure it is a valid format.");
            }
        };

        reader.readAsArrayBuffer(file);
        // Clear input value so same file can be uploaded again
        e.target.value = '';
    };

    // Filter, Sort and Search Pipeline
    const filteredRows = rows.filter(row => {
        if (searchQuery) {
            const matchesQuery = Object.values(row).some(val => 
                String(val || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (!matchesQuery) return false;
        }

        for (const [key, value] of Object.entries(filters)) {
            if (value) {
                const cellVal = String(row[key] || '').toLowerCase();
                const filterVal = value.toLowerCase();
                const isDateField = ALL_COLUMNS.find(c => c.key === key)?.type === 'date';
                
                if (isDateField) {
                    // Match YYYY-MM prefix (e.g. '2025-01' matches '2025-01-14')
                    if (!cellVal.startsWith(filterVal)) return false;
                } else {
                    // Exact value match for unique values list
                    if (cellVal !== filterVal) return false;
                }
            }
        }

        return true;
    });

    if (sortConfig.key) {
        filteredRows.sort((a, b) => {
            let aVal = a[sortConfig.key] || '';
            let bVal = b[sortConfig.key] || '';

            if (!isNaN(Number(aVal)) && !isNaN(Number(bVal)) && aVal !== '' && bVal !== '') {
                aVal = Number(aVal);
                bVal = Number(bVal);
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const renderFormField = (col, isEdit = false) => {
        // 1. Job No. is read-only
        if (col.key === 'job_no') {
            return (
                <input
                    type="text"
                    name={col.key}
                    value={formData[col.key] || ''}
                    readOnly
                    placeholder="Auto-generated"
                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none h-8 text-slate-500 cursor-not-allowed font-semibold w-full"
                />
            );
        }

        // 2. Invoice Amount is read-only, dynamic from MasterBL
        if (col.key === 'invoice_amount') {
            return (
                <input
                    type="text"
                    name={col.key}
                    value={formData[col.key] || ''}
                    readOnly
                    placeholder="Synced from Master BL"
                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none h-8 text-slate-550 cursor-not-allowed w-full"
                />
            );
        }

        // 3. POL and POD use PortSelect
        if (col.key === 'pol' || col.key === 'pod') {
            return (
                <PortSelect
                    name={col.key}
                    value={formData[col.key] || ''}
                    onChange={handleFormChange}
                    placeholder={`Search ${col.label}...`}
                    inputClassName="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 h-8 text-slate-800 dark:text-slate-200"
                />
            );
        }

        // 4. Consignee / Agent / S/L Line (shipping_line) / CHA / CFS use PartySelect
        if (['consignee', 'agent', 'shipping_line', 'cha', 'cfs'].includes(col.key)) {
            let category = '';
            if (col.key === 'consignee') category = 'Customer';
            if (col.key === 'agent') category = 'Agent';
            if (col.key === 'shipping_line') category = 'Carrier';
            if (col.key === 'cha') category = 'CHA';
            if (col.key === 'cfs') category = 'CFS';

            return (
                <PartySelect
                    name={col.key}
                    value={formData[col.key] || ''}
                    onChange={handleFormChange}
                    parties={parties}
                    category={category}
                    placeholder={`Search ${col.label}...`}
                />
            );
        }

        // 5. Container Size uses select list dropdown
        if (col.key === 'container_size') {
            const CONTAINER_SIZES = [
                "20 Dry Standard", "40 Dry Standard", "40 Dry High", "45 Dry High",
                "20 Tank", "40 Tank",
                "20' Reefer Standard", "40' Reefer High",
                "20 Open Top", "40 Open Top", "40 Open Top High",
                "40 Flat Standard", "40 Flat High", "20 Flat"
            ];
            return (
                <select
                    name={col.key}
                    value={formData[col.key] || ''}
                    onChange={handleFormChange}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 h-8 text-slate-800 dark:text-slate-200"
                >
                    <option value="">Select Size</option>
                    {CONTAINER_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            );
        }

        // 6. SWB and IGM use tickboxes (checkboxes)
        if (col.key === 'swb' || col.key === 'igm') {
            const valStr = String(formData[col.key] || '').trim().toUpperCase();
            const isChecked = ['YES', 'Y', 'TRUE', '1'].includes(valStr) || formData[col.key] === true;
            return (
                <div className="flex items-center h-8 pl-1">
                    <input
                        type="checkbox"
                        name={col.key}
                        checked={isChecked}
                        onChange={(e) => {
                            handleFormChange({
                                target: {
                                    name: col.key,
                                    value: e.target.checked ? 'Yes' : 'No'
                                }
                            });
                        }}
                        className="rounded border-slate-300 dark:border-slate-600 text-indigo-650 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                    />
                    <span className="text-xs ml-2 text-slate-600 dark:text-slate-400">
                        {isChecked ? 'Yes' : 'No'}
                    </span>
                </div>
            );
        }

        // 7. Status column select
        if (col.key === 'status') {
            return (
                <select
                    name={col.key}
                    value={formData[col.key] || 'Current'}
                    onChange={handleFormChange}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 h-8 text-slate-800 dark:text-slate-200"
                >
                    <option value="Current">Current</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Closed">Closed</option>
                </select>
            );
        }

        // 8. Textarea for longtext fields
        if (col.type === 'longtext') {
            return (
                <textarea
                    name={col.key}
                    value={formData[col.key] || ''}
                    onChange={(e) => handleFormChange({ target: { name: col.key, value: e.target.value } })}
                    rows={2}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                />
            );
        }

        // 9. General inputs with specific validation/formatting
        const handleInputChange = (e) => {
            let val = e.target.value;
            if (['hbl', 'mbl', 'container_no'].includes(col.key)) {
                val = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            }
            if (col.key === 'teus') {
                val = val.replace(/[^0-9]/g, '');
            }
            handleFormChange({ target: { name: col.key, value: val } });
        };

        return (
            <input
                type={col.type === 'date' ? 'date' : 'text'}
                name={col.key}
                value={formData[col.key] || ''}
                onChange={handleInputChange}
                className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 h-8 text-slate-800 dark:text-slate-200 w-full"
            />
        );
    };

    return (
        <DashboardLayout title="Booking Updates">
            <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
                
                {/* Hidden File Input for Excel Upload */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleExcelUpload} 
                    accept=".xlsx, .xls, .csv" 
                    className="hidden" 
                />

                {/* Excel-like Toolbar & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-30">
                    <div className="flex flex-wrap items-center gap-2">
                        <button 
                            onClick={handleOpenAddModal}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-semibold transition shadow-sm"
                        >
                            <Plus size={16} />
                            <span>Add Job</span>
                        </button>
                        
                        {/* Search & Actions */}
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                                <Search size={15} />
                            </span>
                            <input 
                                type="text"
                                placeholder="Search grid..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-56 pl-9 pr-3 py-1.5 text-sm bg-slate-550 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setShowFilterRow(!showFilterRow)}
                                className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition ${showFilterRow ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
                                title="Toggle Filter Row"
                            >
                                <Filter size={16} />
                            </button>
                            <button 
                                onClick={handleRefresh}
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                                title="Refresh"
                            >
                                <RefreshCw size={16} />
                            </button>

                            <button 
                                onClick={handleUploadButtonClick}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 text-xs font-bold transition border border-emerald-200/50"
                                title="Upload Excel document"
                            >
                                <Upload size={14} />
                                <span>Upload from Excel</span>
                            </button>
                            <button 
                                onClick={handleExportExcel}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 text-xs font-bold transition border border-indigo-200/50"
                                title="Export displayed data"
                            >
                                <Download size={14} />
                                <span>Export Excel</span>
                            </button>
                        </div>
                    </div>

                    {/* Column Configuration Show/Hide */}
                    <div className="relative" ref={colSettingsRef}>
                        <button 
                            onClick={() => setShowColSettings(!showColSettings)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition"
                        >
                            <Settings size={16} />
                            <span>Columns</span>
                            <ChevronDown size={14} />
                        </button>
                        
                        {showColSettings && (
                            <div className="absolute right-0 mt-1.5 w-60 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-3 z-50">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Show/Hide Columns</h4>
                                <div className="space-y-1.5">
                                    {allowedColumns.filter(col => col.key !== 'status').map(col => (
                                        <label key={col.key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                checked={visibleColumns[col.key]}
                                                onChange={(e) => setVisibleColumns({
                                                    ...visibleColumns,
                                                    [col.key]: e.target.checked
                                                })}
                                                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Spreadsheet Grid Container */}
                <div 
                    ref={gridRef}
                    className="flex-1 overflow-auto border-t border-slate-200 dark:border-slate-700"
                >
                    <table className="table-fixed min-w-full border-collapse select-text">
                        <thead className={freezeHeader ? "sticky top-0 bg-slate-100 dark:bg-slate-800 shadow-sm z-20" : "bg-slate-100 dark:bg-slate-800"}>
                            <tr>
                                <th className="w-8 px-1 py-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase bg-slate-100 dark:bg-slate-800 text-center select-none">
                                    View
                                </th>
                                <th className="w-20 px-1 py-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase bg-slate-100 dark:bg-slate-800 text-center select-none">
                                    Status
                                </th>
                                <th className="w-10 px-1 py-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase bg-slate-100 dark:bg-slate-800 text-center">
                                    Sr No.
                                </th>
                                {allowedColumns.filter(col => col.key !== 'status' && visibleColumns[col.key]).map(col => (
                                    <th 
                                        key={col.key}
                                        style={{ width: col.width }}
                                        onClick={() => handleSort(col.key)}
                                        className="px-1.5 py-1 border border-slate-200 dark:border-slate-700 text-left text-slate-700 dark:text-slate-200 font-semibold text-xs uppercase hover:bg-slate-200 dark:hover:bg-slate-750 cursor-pointer transition select-none whitespace-normal break-words leading-tight"
                                    >
                                        <div className="flex items-center justify-between gap-0.5">
                                            <span className="break-words leading-tight">{col.label}</span>
                                            <span className="text-slate-400 dark:text-slate-500 shrink-0">
                                                {sortConfig.key === col.key ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                                                ) : (
                                                    <ArrowUpDown size={9} />
                                                )}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>

                            {showFilterRow && (
                                <tr className="bg-slate-550 dark:bg-slate-850">
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800" />
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800" />
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800" />
                                    {allowedColumns.filter(col => col.key !== 'status' && visibleColumns[col.key]).map(col => (
                                        <th key={col.key} className="p-0.5 border border-slate-200 dark:border-slate-700">
                                            {col.type === 'date' ? (
                                                <select
                                                    value={filters[col.key] || ''}
                                                    onChange={(e) => handleFilterChange(col.key, e.target.value)}
                                                    className="w-full px-1 py-0.5 text-xs border border-slate-200 dark:border-slate-755 bg-white dark:bg-slate-900 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                                                >
                                                    <option value="">All</option>
                                                    {getUniqueDateFilterOptions(col.key).map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <select
                                                    value={filters[col.key] || ''}
                                                    onChange={(e) => handleFilterChange(col.key, e.target.value)}
                                                    className="w-full px-1 py-0.5 text-xs border border-slate-200 dark:border-slate-755 bg-white dark:bg-slate-900 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                                                >
                                                    <option value="">All</option>
                                                    {getUniqueColumnValues(col.key).map(val => (
                                                        <option key={val} value={val}>{val}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            )}
                        </thead>

                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                            {loading ? (
                                <tr>
                                    <td 
                                        colSpan={allowedColumns.filter(col => visibleColumns[col.key]).length + 3}
                                        className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <RefreshCw size={24} className="animate-spin text-indigo-600" />
                                            <span className="font-semibold text-sm">Loading spreadsheet rows...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td 
                                        colSpan={allowedColumns.filter(col => visibleColumns[col.key]).length + 3}
                                        className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-semibold"
                                    >
                                        No booking updates found. Click "Add Job" to create a new row manually or upload an Excel file.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row, rowIndex) => (
                                    <tr 
                                        key={row.id} 
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group transition duration-150"
                                    >
                                        {/* View Details Eye Icon Column */}
                                        <td className="px-1 py-1 border border-slate-200 dark:border-slate-700 text-center select-none w-8">
                                            <button 
                                                onClick={() => handleOpenViewModal(row)}
                                                className="p-0.5 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400 dark:text-slate-500 rounded transition"
                                                title="View All Details"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>

                                        {/* Status select column */}
                                        <td className="px-0.5 py-0.5 border border-slate-200 dark:border-slate-700 text-center select-none bg-slate-550/10 dark:bg-slate-800/20 w-20">
                                            <div className="relative flex items-center justify-center w-full">
                                                <select
                                                    value={row.status || 'Current'}
                                                    onChange={async (e) => {
                                                        const newStatus = e.target.value;
                                                        try {
                                                            const res = await api.put(`/booking-updates/${row.id}`, { status: newStatus });
                                                            if (res.data.success) {
                                                                const updated = rows.map(r => r.id === row.id ? { ...r, status: newStatus } : r);
                                                                setRows(updated);
                                                                toast.success(`Status updated to ${newStatus}`);
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                            const msg = err.response?.data?.message || 'Failed to update status.';
                                                            if (msg.includes('Cannot close job')) {
                                                                setIncompleteError(msg);
                                                            } else {
                                                                toast.error(msg);
                                                            }
                                                        }
                                                    }}
                                                    className={`text-[11px] font-semibold rounded px-1 pr-3 py-0.5 border focus:outline-none cursor-pointer transition-colors duration-200 w-full h-5.5 appearance-none text-left
                                                        ${row.status === 'Closed' 
                                                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300' 
                                                            : row.status === 'Cancelled' 
                                                            ? 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300' 
                                                            : 'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                                                        }
                                                    `}
                                                >
                                                    <option value="Current">Current</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                    <option value="Closed">Closed</option>
                                                </select>
                                                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-550 dark:text-slate-400">
                                                    <ChevronDown size={9} />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Sr No. */}
                                        <td className="px-1 py-1 border border-slate-200 dark:border-slate-700 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 select-none w-10">
                                            {rowIndex + 1}
                                        </td>

                                        {/* Display visible cells */}
                                        {allowedColumns.filter(col => col.key !== 'status' && visibleColumns[col.key]).map(col => {
                                            const isSelected = selectedCell.rowIndex === rowIndex && selectedCell.colKey === col.key;
                                            const value = row[col.key] || '';

                                            let isETAWarning = false;
                                            if (col.key === 'eta' && value && row.etd) {
                                                const etaDate = new Date(value);
                                                const etdDate = new Date(row.etd);
                                                if (etaDate < etdDate) {
                                                    isETAWarning = true;
                                                }
                                            }

                                            const isCheckboxField = col.key === 'swb' || col.key === 'igm';
                                            const valStr = String(value || '').trim().toUpperCase();
                                            const isChecked = isCheckboxField && (['YES', 'Y', 'TRUE', '1'].includes(valStr) || value === true);

                                            // Determine background color: for checkboxes, green if checked ('Yes'), red if unchecked ('No')
                                            let hasValue = value !== undefined && value !== null && String(value).trim() !== '';
                                            if (isCheckboxField) {
                                                hasValue = isChecked;
                                            }

                                            let cellBgClass = hasValue
                                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 border-emerald-250 dark:border-emerald-900/60 font-medium'
                                                : 'bg-rose-100 dark:bg-rose-950/40 text-rose-955 dark:text-rose-200 border-rose-250 dark:border-rose-900/60 font-medium';

                                            if (isETAWarning) {
                                                cellBgClass = 'bg-rose-200 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-medium';
                                            }

                                            const isWrapField = col.key === 'consignee' || col.key === 'remarks';

                                            return (
                                                <td 
                                                    key={col.key}
                                                    onClick={() => setSelectedCell({ rowIndex, colKey: col.key })}
                                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, col.key)}
                                                    tabIndex={0}
                                                    className={`px-1.5 py-1 border border-slate-200 dark:border-slate-700 text-[13px] font-medium focus:outline-none transition relative cursor-default select-text ${isWrapField ? 'whitespace-normal break-words leading-snug' : 'whitespace-nowrap'}
                                                        ${isSelected ? 'ring-2 ring-indigo-550 ring-inset bg-indigo-50/20 dark:bg-indigo-950/10' : ''}
                                                        ${cellBgClass}
                                                    `}
                                                >
                                                    {isCheckboxField ? (
                                                        <div className="flex items-center justify-center">
                                                            <input 
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={async (e) => {
                                                                    const newVal = e.target.checked ? 'Yes' : 'No';
                                                                    try {
                                                                        const res = await api.put(`/booking-updates/${row.id}`, { [col.key]: newVal });
                                                                        if (res.data.success) {
                                                                            const updated = rows.map(r => r.id === row.id ? { ...r, [col.key]: newVal } : r);
                                                                            setRows(updated);
                                                                            toast.success(`${col.label} updated to ${newVal}`);
                                                                        }
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        toast.error(`Failed to update ${col.label}`);
                                                                    }
                                                                }}
                                                                className="rounded border-slate-350 dark:border-slate-600 text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span>{value}</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Status bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 z-10">
                    <div className="flex items-center gap-4">
                        <span>Total Records: <strong>{filteredRows.length}</strong></span>
                        {selectedCell.rowIndex !== null && (
                            <span>Selected: Row <strong>{selectedCell.rowIndex + 1}</strong>, Col <strong>{selectedCell.colKey}</strong></span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle size={13} className="text-emerald-500" />
                        <span>Spreadsheet synchronized. Auto-saving enabled.</span>
                    </div>
                </div>

                {/* Add Job Modal (Form Popup) */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <div className="bg-white dark:bg-slate-850 rounded-xl shadow-2xl max-w-6xl w-full border border-slate-100 dark:border-slate-700 max-h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Add New Job Manual Entry</h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAddJobSubmit} className="flex-1 overflow-y-auto p-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {allowedColumns.map(col => (
                                        <div key={col.key} className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{col.label}</label>
                                            {renderFormField(col, false)}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddModalOpen(false)} 
                                        className="px-4 py-2 border border-slate-200 dark:border-slate-750 text-slate-750 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
                                    >
                                        Save Job
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* View Details / Hidden Columns Modal */}
                {isViewModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <div className="bg-white dark:bg-slate-850 rounded-xl shadow-2xl max-w-6xl w-full border border-slate-100 dark:border-slate-700 max-h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Job Details</h3>
                                    <p className="text-xs text-slate-500">View and update hidden or visible columns</p>
                                </div>
                                <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleViewModalSave} className="flex-1 overflow-y-auto p-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {allowedColumns.map(col => {
                                        const isHiddenField = !DISPLAY_COLUMNS_KEYS.includes(col.key);
                                        return (
                                            <div key={col.key} className={`flex flex-col gap-1 p-1.5 px-2 rounded-md ${isHiddenField ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/20' : ''}`}>
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center justify-between">
                                                    <span>{col.label}</span>
                                                    {isHiddenField && (
                                                        <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-full lowercase font-semibold select-none">
                                                            Hidden column
                                                        </span>
                                                    )}
                                                </label>
                                                {renderFormField(col, true)}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsViewModalOpen(false)} 
                                        className="px-4 py-2 border border-slate-200 dark:border-slate-750 text-slate-750 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition"
                                    >
                                        Close
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Incomplete / Cannot Close Modal Alert */}
                {incompleteError && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
                        <div className="bg-white dark:bg-slate-850 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-4 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                                <X size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Job Cannot Be Closed</h3>
                                <p className="text-sm text-slate-650 dark:text-slate-300 mt-2 font-medium">
                                    {incompleteError}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIncompleteError(null)}
                                className="w-full mt-2 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md"
                            >
                                OK, I will complete it
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
};

export default BookingUpdates;
