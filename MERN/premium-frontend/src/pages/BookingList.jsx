import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { 
    Search, Filter, Plus, Edit2, Eye, Truck, CheckCircle, FileText, XCircle 
} from "lucide-react";
import { toast } from "react-toastify";

const BookingList = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedJob, setSelectedJob] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        try {
            const res = await api.get("/booking/get");
            if (res.data.success) {
                setJobs(res.data.bookings || []);
            }
        } catch (error) {
            console.error("Error loading jobs:", error);
            toast.error("Failed to load bookings");
        } finally {
            setLoading(false);
        }
    };

    const handleEditJob = (jobNo) => {
        navigate(`/booking-form?jobNo=${jobNo}`);
    };

    const handleCreateJob = () => {
        navigate('/booking-form');
    };

    // Change status inline
    const handleStatusChange = async (jobNo, newStatus) => {
        // Optimistic update
        const originalJobs = [...jobs];
        const updatedJobs = jobs.map((job) =>
            job.job_no === jobNo ? { ...job, status: newStatus } : job
        );
        setJobs(updatedJobs);

        try {
            await api.put(`/booking/update/${jobNo}`, { status: newStatus });
            toast.success(`Job #${jobNo} marked as ${newStatus}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
            setJobs(originalJobs); // Revert
        }
    };

    const handleViewJob = (job) => {
        setSelectedJob(job);
        setShowViewModal(true);
    };

    const handleCloseViewModal = () => {
        setShowViewModal(false);
        setSelectedJob(null);
    };

    const filteredJobs = jobs.filter((job) => {
        const matchesSearch =
            (job.shipper_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (job.consignee_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            String(job.job_no).includes(searchTerm);
        const matchesStatus =
            filterStatus === "all" || job.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    // Color helpers
    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
            case 'in-transit': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800';
            case 'completed': return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800';
            case 'cancelled': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800';
            default: return 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700';
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Bookings">
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Bookings">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                        <FileText size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white">{jobs.length}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Total Jobs</div>
                    </div>
                </div>
                {/* ... existing stats ... just using jobs array ... */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white">
                             {jobs.filter((j) => j.status === "confirmed").length}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Confirmed</div>
                    </div>
                </div>
                {/* Simplified stats rendering for brevity/correctness */}
                 <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                        <Truck size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white">
                            {jobs.filter((j) => ["in-transit", "completed"].includes(j.status)).length}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">In Progress</div>
                    </div>
                </div>
                 <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                        <FileText size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white">
                            {jobs.filter((j) => j.status === "draft").length}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Drafts</div>
                    </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search jobs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-poppins text-sm"
                        />
                    </div>
                    <div className="relative w-full md:w-48">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter size={18} className="text-slate-400" />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-poppins text-sm appearance-none"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="in-transit">In Transit</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
                <button
                    onClick={handleCreateJob}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap"
                >
                    <Plus size={18} /> New Booking
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                                <th className="p-4">Job No</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Shipper</th>
                                <th className="p-4">Route</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        {searchTerm ? "No jobs match your search." : "No jobs found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map((job) => (
                                    <tr key={job.job_no} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">#{job.job_no}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                                            {job.date_of_nomination ? new Date(job.date_of_nomination).toLocaleDateString() : "-"}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                                {job.shipper_name || "—"}
                                            </div>
                                            <div className="text-xs text-slate-500">{job.container_count} × {job.container_size}</div>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                                            {job.pol} → {job.pod}
                                        </td>
                                        <td className="p-4">
                                             <select
                                                value={job.status || "draft"}
                                                onChange={(e) => handleStatusChange(job.job_no, e.target.value)}
                                                className={`px-2 py-1 rounded text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer ${getStatusColor(job.status || 'draft')}`}
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="in-transit">In Transit</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => handleViewJob(job)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                                title="View"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEditJob(job.job_no)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                         </tbody>
                    </table>
                </div>
            </div>

            {/* View Modal */}
             {showViewModal && selectedJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleCloseViewModal}>
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                Job #{selectedJob.job_no}
                            </h3>
                            <button onClick={handleCloseViewModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                             <div>
                                <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">Date</label>
                                <div className="text-slate-800 dark:text-slate-200">
                                    {selectedJob.date_of_nomination ? new Date(selectedJob.date_of_nomination).toLocaleDateString() : "-"}
                                </div>
                             </div>
                             <div>
                                <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">Status</label>
                                <div className="capitalize text-slate-800 dark:text-slate-200">{selectedJob.status}</div>
                             </div>
                             <div>
                                <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">Shipper</label>
                                <div className="text-slate-800 dark:text-slate-200">{selectedJob.shipper_name || "—"}</div>
                             </div>
                             <div>
                                <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">Consignee</label>
                                <div className="text-slate-800 dark:text-slate-200">{selectedJob.consignee_name || "—"}</div>
                             </div>
                             <div>
                                <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">Route</label>
                                <div className="text-slate-800 dark:text-slate-200">{selectedJob.pol} → {selectedJob.pod}</div>
                             </div>
                             <div>
                                <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">Equipment</label>
                                <div className="text-slate-800 dark:text-slate-200">{selectedJob.container_count} × {selectedJob.container_size}</div>
                             </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                             <button
                                onClick={handleCloseViewModal}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
             )}
        </DashboardLayout>
    );
};

export default BookingList;
