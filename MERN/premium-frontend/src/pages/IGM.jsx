import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { 
    Search, Plus, Edit2, Save, XCircle, Trash2, FileText, Anchor, Container 
} from "lucide-react";
import { toast } from "react-toastify";

const INITIAL_KYC = {
  chas: ["ABC CHA Services", "Global CHA Solutions"],
  cfss: ["XYZ CFS Yard", "Seaport CFS Terminal"],
};

const EMPTY_FORM = {
    id: null,
    hblNo: "", mblNo: "", eta: "", etd: "",
    igmOn: "HBL", igmNo: "",
    chaName: "", cfsName: "",
    freightAmount: "", freightCurrency: "INR",
    doValidity: "", containerNumber: "",
};

const IGM = () => {
    const [igmList, setIgmList] = useState([]);
    const [igmForm, setIgmForm] = useState(EMPTY_FORM);
    const [kycData, setKycData] = useState(INITIAL_KYC);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [showAddNew, setShowAddNew] = useState({ type: null, value: "" });

    // Load data on mount
    useEffect(() => {
        try {
            const savedKyc = JSON.parse(localStorage.getItem("kycData") || "null");
            if (savedKyc) setKycData(prev => ({ ...prev, ...savedKyc }));

            const savedIGMs = JSON.parse(localStorage.getItem("savedIGMs") || "[]");
            setIgmList(savedIGMs);
        } catch (e) {
            console.error("Failed to load local storage data", e);
        }
    }, []);

    const persistList = (list) => {
        setIgmList(list);
        localStorage.setItem("savedIGMs", JSON.stringify(list));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setIgmForm(prev => ({ ...prev, [name]: value }));
    };

    const handleOpenModal = (record = null) => {
        if (record) {
            setIgmForm(record);
            setIsEdit(true);
        } else {
            setIgmForm(EMPTY_FORM);
            setIsEdit(false);
        }
        setIsModalOpen(true);
    };

    const handleSaveIGM = (e) => {
        e.preventDefault();
        if (isEdit) {
            const updatedList = igmList.map(item => 
                item.id === igmForm.id ? { ...igmForm, savedAt: new Date().toISOString() } : item
            );
            persistList(updatedList);
            toast.success("IGM updated successfully");
        } else {
            const newRecord = {
                ...igmForm,
                id: Date.now(),
                savedAt: new Date().toISOString(),
            };
            persistList([...igmList, newRecord]);
            toast.success("IGM created successfully");
        }
        setIsModalOpen(false);
    };

    const handleDeleteIGM = (id) => {
        if(window.confirm("Are you sure you want to delete this IGM?")) {
            const updatedList = igmList.filter(item => item.id !== id);
            persistList(updatedList);
            toast.info("IGM deleted");
        }
    };

    // Dynamic Add Logic
    const handleSelectKyc = (role, value) => {
        if (value === "ADD_NEW") {
            setShowAddNew({ type: role, value: "" });
        } else {
            setIgmForm(prev => ({ ...prev, [role]: value }));
        }
    };

    const handleSaveNewKyc = () => {
        if (!showAddNew.type || !showAddNew.value.trim()) return;
        const trimmed = showAddNew.value.trim();
        const listName = showAddNew.type === "chaName" ? "chas" : "cfss";
        
        const updatedKyc = {
            ...kycData,
            [listName]: [...kycData[listName], trimmed]
        };
        
        setKycData(updatedKyc);
        localStorage.setItem("kycData", JSON.stringify(updatedKyc));
        setIgmForm(prev => ({ ...prev, [showAddNew.type]: trimmed }));
        setShowAddNew({ type: null, value: "" });
        toast.success(`New ${showAddNew.type === 'chaName' ? 'CHA' : 'CFS'} added`);
    };

    const filteredIGMs = igmList.filter(item => {
        const term = searchTerm.toLowerCase();
        return (
            (item.hblNo || "").toLowerCase().includes(term) ||
            (item.mblNo || "").toLowerCase().includes(term) ||
            (item.igmNo || "").toLowerCase().includes(term) ||
            (item.containerNumber || "").toLowerCase().includes(term)
        );
    });

    return (
        <DashboardLayout title="IGM Management">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search HBL / MBL / IGM / Container..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-dark-card text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
                >
                    <Plus size={20} /> Add IGM
                </button>
            </div>

            {/* List */}
             <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                                <th className="p-4">HBL / MBL</th>
                                <th className="p-4">IGM Details</th>
                                <th className="p-4">Container</th>
                                <th className="p-4">Parties</th>
                                <th className="p-4">Saved At</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                             {filteredIGMs.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No IGM records found.</td></tr>
                             ) : (
                                 filteredIGMs.map(item => (
                                     <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                         <td className="p-4">
                                            <div className="font-mono text-sm text-indigo-600 dark:text-indigo-400">{item.hblNo || "—"}</div>
                                            <div className="text-xs text-slate-500">{item.mblNo}</div>
                                         </td>
                                         <td className="p-4">
                                             <div className="flex items-center gap-2 text-sm text-slate-800 dark:text-white">
                                                 <FileText size={16} className="text-slate-400"/> {item.igmNo} <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{item.igmOn}</span>
                                             </div>
                                         </td>
                                         <td className="p-4">
                                             <div className="flex items-center gap-2 text-sm text-slate-800 dark:text-white">
                                                <Container size={16} className="text-slate-400"/> {item.containerNumber}
                                             </div>
                                         </td>
                                         <td className="p-4 text-sm">
                                             <div className="text-slate-800 dark:text-white truncate max-w-[150px]" title={item.chaName}>{item.chaName}</div>
                                             <div className="text-xs text-slate-500 truncate max-w-[150px]" title={item.cfsName}>{item.cfsName}</div>
                                         </td>
                                         <td className="p-4 text-xs text-slate-500">
                                             {item.savedAt ? new Date(item.savedAt).toLocaleDateString() : "-"}
                                         </td>
                                         <td className="p-4 text-right flex justify-end gap-2">
                                             <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                                 <Edit2 size={18} />
                                             </button>
                                              <button onClick={() => handleDeleteIGM(item.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                                                 <Trash2 size={18} />
                                             </button>
                                         </td>
                                     </tr>
                                 ))
                             )}
                         </tbody>
                    </table>
                </div>
             </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {isEdit ? "Edit IGM Details" : "Add New IGM"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveIGM} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* HBL / MBL */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">HBL No.</label>
                                    <input type="text" name="hblNo" value={igmForm.hblNo} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">MBL No.</label>
                                    <input type="text" name="mblNo" value={igmForm.mblNo} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                </div>

                                {/* Dates */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ETA</label>
                                    <input type="date" name="eta" value={igmForm.eta} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ETD</label>
                                    <input type="date" name="etd" value={igmForm.etd} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                </div>

                                {/* IGM Info */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IGM On</label>
                                        <select name="igmOn" value={igmForm.igmOn} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                            <option value="HBL">HBL</option>
                                            <option value="MBL">MBL</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IGM No.</label>
                                        <input type="text" name="igmNo" value={igmForm.igmNo} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                    </div>
                                </div>

                                {/* CHA / CFS */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CHA Name</label>
                                    <select name="chaName" value={igmForm.chaName} onChange={(e) => handleSelectKyc('chaName', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                        <option value="">Select CHA</option>
                                        {kycData.chas.map(c => <option key={c} value={c}>{c}</option>)}
                                        <option value="ADD_NEW">+ Add New CHA</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CFS Name</label>
                                    <select name="cfsName" value={igmForm.cfsName} onChange={(e) => handleSelectKyc('cfsName', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                        <option value="">Select CFS</option>
                                        {kycData.cfss.map(c => <option key={c} value={c}>{c}</option>)}
                                        <option value="ADD_NEW">+ Add New CFS</option>
                                    </select>
                                </div>

                                {/* Freight / Container */}
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Freight Amount</label>
                                        <input type="number" name="freightAmount" value={igmForm.freightAmount} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                    </div>
                                    <div>
                                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                                         <select name="freightCurrency" value={igmForm.freightCurrency} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                            <option value="INR">INR</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">DO Validity</label>
                                     <input type="date" name="doValidity" value={igmForm.doValidity} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                                </div>
                                <div className="md:col-span-2">
                                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Container Number</label>
                                     <input type="text" name="containerNumber" value={igmForm.containerNumber} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Enter container number"/>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-md flex items-center gap-2">
                                    <Save size={18} /> Save IGM
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sub-modal for adding new CHA/CFS */}
             {showAddNew.type && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddNew({type:null, value:''})}>
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add New {showAddNew.type === 'chaName' ? 'CHA' : 'CFS'}</h3>
                        <input
                            autoFocus
                            type="text"
                            value={showAddNew.value}
                            onChange={(e) => setShowAddNew(prev => ({...prev, value: e.target.value}))}
                            className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white mb-6 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="Enter name"
                        />
                        <div className="flex justify-end gap-2">
                             <button type="button" onClick={() => setShowAddNew({type:null, value:''})} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                             <button type="button" onClick={handleSaveNewKyc} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Add</button>
                        </div>
                    </div>
                </div>
             )}
        </DashboardLayout>
    );
};

export default IGM;
