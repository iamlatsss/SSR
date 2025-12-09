import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../NavBar/navbar";

const JobListPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const navigate = useNavigate();  // ✅ FIXED: Proper destructuring
  const location = useLocation();  // ✅ FIXED: Proper destructuring

  // Load jobs from localStorage (demo data)
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = () => {
    try {
      const savedJobs = localStorage.getItem("savedJobs");
      if (savedJobs) {
        setJobs(JSON.parse(savedJobs));
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error("Error loading jobs:", error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = (jobNo) => {
    navigate(`/booking-workspace?jobNo=${jobNo}`);
  };

  const handleDeleteJob = (jobNo) => {
    if (window.confirm("Are you sure you want to delete this job?")) {
      const updatedJobs = jobs.filter(job => job.jobNo !== jobNo);
      setJobs(updatedJobs);
      localStorage.setItem("savedJobs", JSON.stringify(updatedJobs));
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.shipper?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.consignee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.jobNo.toString().includes(searchTerm);
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Check if editing existing job from query params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const jobNo = urlParams.get("jobNo");
    if (jobNo) {
      const job = jobs.find(j => j.jobNo === parseInt(jobNo));
      if (job) {
        navigate(`/booking-workspace?jobNo=${jobNo}`);
      }
    }
  }, [location.search, jobs, navigate]);

  const saveDemoJob = () => {
    // Demo function to quickly add sample jobs
    const demoJobs = [
      {
        jobNo: 6001,
        dateOfNomination: "2025-12-09",
        shipper: "ABC Exports Pvt Ltd",
        consignee: "XYZ Imports LLC",
        pol: "Nhava Sheva, INNSA",
        pod: "Singapore, SGSIN",
        containerSize: "40' GP",
        containerCount: 2,
        agent: "SeaLink Logistics",
        status: "draft",
        updates: []
      },
      {
        jobNo: 6002,
        dateOfNomination: "2025-12-08",
        shipper: "Global Traders Inc",
        consignee: "Oceanic Retailers",
        pol: "Mundra, INMUN",
        pod: "Shanghai, CNSHA",
        containerSize: "20' GP",
        containerCount: 1,
        agent: "PortSide Agencies",
        status: "confirmed",
        updates: [
          { hblNo: "HBL123", mblNo: "MBL456", eta: "2025-12-15", status: "confirmed" }
        ]
      }
    ];
    
    localStorage.setItem("savedJobs", JSON.stringify(demoJobs));
    setJobs(demoJobs);
    alert("Demo jobs added! Refresh to see them.");
  };

  if (loading) {
    return (
      <div className="min-h-screen p-15 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-15">
      <Navbar />
      
      <div className="max-w-7xl mx-auto mt-8">
        <div className="bg-white rounded-3xl shadow-2xl p-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h3 className="text-3xl font-bold text-gray-800 mb-2">
                All Jobs ({jobs.length})
              </h3>
              <p className="text-gray-600">Manage and track all your shipping bookings</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveDemoJob}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                📊 Add Demo Data
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-gray-50 p-6 rounded-xl mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Jobs</label>
                <input
                  type="text"
                  placeholder="Search by shipper, consignee, or job no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in-transit">In Transit</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="text-right">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2.5 rounded-lg text-sm transition-colors"
                  onClick={() => { setSearchTerm(""); setFilterStatus("all"); }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 text-sm bg-white rounded-xl overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300">
                  <th className="px-6 py-4 text-left font-semibold text-gray-800 border-r border-gray-200">Job No</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800 border-r border-gray-200">Date</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800 border-r border-gray-200">Shipper</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800 border-r border-gray-200">Consignee</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800 border-r border-gray-200">Route</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800 border-r border-gray-200">Containers</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800 border-r border-gray-200">Agent</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800 border-r border-gray-200">Status</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || filterStatus !== "all" ? "No jobs match your filters." : "No jobs found. Create your first booking!"}
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job.jobNo} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-lg text-gray-900 border-r border-gray-100">
                        #{job.jobNo}
                      </td>
                      <td className="px-6 py-4 text-gray-700 border-r border-gray-100">
                        {job.dateOfNomination}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-100 max-w-xs truncate">
                        {job.shipper}
                      </td>
                      <td className="px-6 py-4 text-gray-700 border-r border-gray-100 max-w-xs truncate">
                        {job.consignee}
                      </td>
                      <td className="px-6 py-4 text-gray-700 border-r border-gray-100">
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                          <span className="font-mono text-sm">{job.pol} → {job.pod}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-100">
                        {job.containerCount} × {job.containerSize}
                      </td>
                      <td className="px-6 py-4 text-gray-700 border-r border-gray-100 max-w-xs truncate">
                        {job.agent}
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          job.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          job.status === 'in-transit' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {job.status?.charAt(0).toUpperCase() + job.status?.slice(1) || 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditJob(job.jobNo)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm hover:shadow-md"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.jobNo)}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm hover:shadow-md"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Stats Cards */}
          {filteredJobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-xl">
                <div className="text-2xl font-bold">{filteredJobs.length}</div>
                <div className="text-blue-100">Total Jobs</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-xl">
                <div className="text-2xl font-bold">{filteredJobs.filter(j => j.status === 'confirmed').length}</div>
                <div className="text-green-100">Confirmed</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900 p-6 rounded-2xl shadow-xl">
                <div className="text-2xl font-bold">{filteredJobs.filter(j => j.status === 'draft').length}</div>
                <div className="font-semibold">Drafts</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-xl">
                <div className="text-2xl font-bold">
                  {filteredJobs.filter(j => j.status === 'in-transit' || j.status === 'completed').length}
                </div>
                <div className="text-purple-100">In Progress</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobListPage;
