import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Eye,
  XCircle,
  FileText,
  CheckCircle,
} from "lucide-react";

const API_BASE = "/api/booking";

export default function BookingPage() {
  const navigate = useNavigate();

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);


  const getHeaders = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return {
        "Content-Type": "application/json",
      };
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  /* ================= STATE ================= */
  const [jobNo, setJobNo] = useState("");
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchJobNo, setSearchJobNo] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);



  /* ================= API ================= */
  const fetchInit = async () => {
    try {
      const res = await fetch(`${API_BASE}/init`, { headers: getHeaders() });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
        throw new Error("Session expired. Please login again.");
      }

      if (!res.ok) {
        throw new Error(data.message || "Init failed");
      }

      setJobNo(data.nextJobNo || "");
      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Fetch Init Error", error);
      throw error;
    }
  };

  const loadBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/get`, { headers: getHeaders() });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        // Token might be invalid
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || "Load failed");
      }

      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Load Bookings Error", error);
      throw error;
    }
  };



  const getBookingByJobNo = async (jobNo) => {
    const res = await fetch(`${API_BASE}/get/${jobNo}`, {
      headers: getHeaders(),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Not found");
    }

    return data.booking;
  };

  const updateBookingStatus = async (jobNo, status) => {
    const res = await fetch(`${API_BASE}/update/${jobNo}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Update failed");
    }
  };

  /* ================= INIT LOAD ================= */
  useEffect(() => {
    const initData = async () => {
      try {
        console.log("Starting initData...");
        setLoading(true);
        setMessage("");

        console.log("Calling fetchInit...");
        await fetchInit();
        console.log("fetchInit done.");

        console.log("Calling loadBookings...");
        await loadBookings();
        console.log("loadBookings done.");

      } catch (err) {
        console.error("Caught error in initData:", err);
        setMessage(`Failed to load: ${err.message}`);
      } finally {
        console.log("Setting loading to false");
        setLoading(false);
      }
    };

    initData();
  }, []);

  /* ================= HANDLERS ================= */



  const handleView = async () => {
    if (!searchJobNo) {
      setMessage("Please enter Job No");
      return;
    }
    try {
      const job = await getBookingByJobNo(searchJobNo);
      setSelectedJob(job);
      setShowViewModal(true);
      setMessage("");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleStatusChange = async (jobNo, status) => {
    try {
      await updateBookingStatus(jobNo, status);
      await loadBookings();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleViewJob = async (jobNo) => {
    try {
      const job = await getBookingByJobNo(jobNo);
      setSelectedJob(job);
      setShowViewModal(true);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleEditJob = (jobNo) => {
    navigate(`/booking-form?jobNo=${jobNo}`);
  };

  const handleCreateJob = () => {
    navigate("/booking-form");
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedJob(null);
  };

  /* ================= FILTER ================= */
  const filteredBookings = Array.isArray(bookings) ? bookings.filter((b) => {
    const sTerm = searchTerm.toLowerCase();
    const matchSearch =
      !searchTerm ||
      String(b.job_no || "").toLowerCase().includes(sTerm) ||
      String(b.shipper_name || "").toLowerCase().includes(sTerm) ||
      String(b.consignee_name || "").toLowerCase().includes(sTerm);

    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    return matchSearch && matchStatus;
  }) : [];

  /* ================= STATUS COLORS ================= */
  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20";
      case "in-transit":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "completed":
        return "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20";
      case "cancelled":
        return "text-red-600 bg-red-50 dark:bg-red-900/20";
      default:
        return "text-slate-600 bg-slate-50 dark:bg-slate-800/50";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Bookings">
        <div className="flex justify-center h-96 items-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bookings">
      {/* Message */}
      {message && (
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            {message}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {bookings.length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Total Jobs
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {bookings.filter((b) => b.status === "confirmed").length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Confirmed
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Quick Search */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
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
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Job No"
              value={searchJobNo}
              onChange={(e) => setSearchJobNo(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-dark-card text-sm w-28"
            />
            <button
              onClick={handleView}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
            >
              View
            </button>
          </div>
        </div>
        <button
          onClick={handleCreateJob}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap"
        >
          <Plus size={18} /> New Booking (#{jobNo})
        </button>
      </div>

      {/* Bookings Table */}
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
              {filteredBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    {searchTerm
                      ? "No bookings match your search."
                      : "No bookings found. Create your first booking!"}
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr
                    key={booking.job_no}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      #{booking.job_no}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                      {booking.date_of_nomination?.split("T")[0] || "—"}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                        {booking.shipper_name || booking.shipper || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {booking.container_count || 0} ×{" "}
                        {booking.container_size || "—"}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                      {booking.pol || "—"} → {booking.pod || "—"}
                    </td>
                    <td className="p-4">
                      <select
                        value={booking.status || "draft"}
                        onChange={(e) =>
                          handleStatusChange(booking.job_no, e.target.value)
                        }
                        className={`px-2 py-1 rounded text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer ${getStatusColor(
                          booking.status || "draft"
                        )}`}
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
                        onClick={() => handleViewJob(booking.job_no)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditJob(booking.job_no)}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleCloseViewModal}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Job #{selectedJob.job_no}
              </h3>
              <button
                onClick={handleCloseViewModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Date
                </label>
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  {selectedJob.date_of_nomination?.split("T")[0] || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Status
                </label>
                <div
                  className={`font-medium px-2 py-1 rounded-full text-xs ${getStatusColor(
                    selectedJob.status
                  )}`}
                >
                  {selectedJob.status}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Shipper
                </label>
                <div className="text-slate-800 dark:text-slate-200">
                  {selectedJob.shipper_name || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Consignee
                </label>
                <div className="text-slate-800 dark:text-slate-200">
                  {selectedJob.consignee_name || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Agent
                </label>
                <div className="text-slate-800 dark:text-slate-200">
                  {selectedJob.agent_name || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Route
                </label>
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  {selectedJob.pol || "—"} → {selectedJob.pod || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Final POD
                </label>
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  {selectedJob.final_pod || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  ETA / ETD
                </label>
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  {selectedJob.eta?.split("T")[0] || "—"} / {selectedJob.etd?.split("T")[0] || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Container Info
                </label>
                <div className="text-slate-800 dark:text-slate-200">
                  {selectedJob.container_count} × {selectedJob.container_size}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  HBL / MBL
                </label>
                <div className="text-slate-800 dark:text-slate-200 font-mono text-xs">
                  HBL: {selectedJob.hbl_no || "—"}<br />
                  MBL: {selectedJob.mbl_no || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Weight (Net / Gross)
                </label>
                <div className="text-slate-800 dark:text-slate-200">
                  {selectedJob.net_weight || "—"} / {selectedJob.gross_weight || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Cargo / Shipping Line
                </label>
                <div className="text-slate-800 dark:text-slate-200">
                  {selectedJob.cargo_type || "—"} / {selectedJob.shipping_line_name || "—"}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs uppercase font-semibold text-slate-500 mb-2">
                  Marks & Numbers
                </label>
                <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  {selectedJob.marks_and_numbers || "—"}
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleCloseViewModal}
                className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
