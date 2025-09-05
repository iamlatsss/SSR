import React, { useState } from "react";
import Navbar from "../NavBar/navbar";
import Bookingdetails from "./bookingdetails";
import Bookings from "./bookings";

const Bookingstatus = ({ bookings = [] }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("");

  const handleStatusChange = (jobNumber, newStatus) => {
    // Example: call API to save status update
    console.log(`Saving status for job ${jobNumber}: ${newStatus}`);
  };

  const filteredBookings = (bookings || []).filter((b) => {
  const matchesJob = b.job_number
    .toLowerCase()
    .includes(jobFilter.toLowerCase());
  const matchesStatus =
    statusFilter === "all" ||
    b.status.toLowerCase() === statusFilter.toLowerCase();
  return matchesJob && matchesStatus;
});

  return (
    <div className="min-h-screen rounded-2xl p-25">
        <Navbar/>
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-2xl p-6 overflow-x-auto">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          Booking Status
        </h3>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 mb-6 justify-between">
          <div>
            <label className="font-semibold block mb-1">
              Filter by Job Number:
            </label>
            <input
              type="text"
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="border px-3 py-2 rounded-lg w-full md:w-64"
              placeholder="Enter Job Number"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">Filter by Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border px-3 py-2 rounded-lg w-full md:w-64"
            >
              <option value="all">All</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <table className="min-w-[900px] w-full border border-gray-300 text-sm text-center rounded-lg overflow-hidden">
          <thead className="bg-gray-800 text-white">
            <tr>
              {[
                "Job No.",
                "Consignee",
                "Shipper",
                "POL",
                "POD",
                "ETD",
                "ETA",
                "Status",
                "Save",
                "Print",
              ].map((header, idx) => (
                <th key={idx} className="border px-3 py-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length > 0 ? (
              filteredBookings.map((b, idx) => (
                <tr key={idx} className="hover:bg-gray-100">
                  <td className="border px-2 py-1">{b.job_number}</td>
                  <td className="border px-2 py-1">{b.consignee_details}</td>
                  <td className="border px-2 py-1">{b.shipper_details}</td>
                  <td className="border px-2 py-1">{b.pol}</td>
                  <td className="border px-2 py-1">{b.pod}</td>
                  <td className="border px-2 py-1">{b.etd}</td>
                  <td className="border px-2 py-1">{b.eta}</td>
                  <td className="border px-2 py-1">
                    <select
                      value={b.status}
                      onChange={(e) =>
                        handleStatusChange(b.job_number, e.target.value)
                      }
                      className="border rounded-lg px-2 py-1"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                      <option value="Canceled">Canceled</option>
                    </select>
                  </td>
                  <td className="border px-2 py-1">
                    <button
                      onClick={() => handleStatusChange(b.job_number, b.status)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg"
                    >
                      Save
                    </button>
                  </td>
                  <td className="border px-2 py-1">
                    <a
                      href={`/delivery-order/${b.job_number}`}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg"
                    >
                      Preview
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="10"
                  className="border px-3 py-4 text-gray-500 text-center"
                >
                  No bookings available
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Back Button */}
        <div className="text-center mt-6">
          <a
            href="/bookinglist"
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-xl"
          >
            Go Back
          </a>
        </div>
      </div>
    </div>
  );
};

export default Bookingstatus;
