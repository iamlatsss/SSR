import React, { useState } from "react";
import Navbar from "../NavBar/navbar";
import Bookingdetails from "./bookingdetails";

function Bookings() {
  const [searchTerm, setSearchTerm] = useState("");

  const bookings = [
    { id: 1, customer: "John Doe", date: "2025-09-05", status: "Confirmed" },
    { id: 2, customer: "Jane Smith", date: "2025-09-06", status: "Pending" },
  ];

  const filteredBookings = bookings.filter((booking) =>
    booking.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen p-20">
      <Navbar />

      <div className="max-w-full mx-auto mt-8 bg-white rounded-3xl shadow-2xl p-6 overflow-x-auto">
        {/* Header with Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-3xl font-bold text-gray-800 text-center md:text-left">
            🧾 All Booking Entries
          </h3>

          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="🔍 Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border px-4 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <a
              href="/booking"
              className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-xl shadow-lg transition"
            >
              + Add New Booking
            </a>
          </div>
        </div>

        {/* Table */}
        <table className="min-w-[1200px] w-full table-auto border-collapse text-center text-black">
          <thead className="bg-gray-800 text-white">
            <tr>
              {[
                "Job No.",
                "Nomination Date",
                "Consignee",
                "Shipper",
                "HBL",
                "MBL",
                "POL",
                "POD",
                "Container Size",
                "Agent",
                "Shipping Line",
                "Buy Rate",
                "Sell Rate",
                "ETD",
                "ETA",
                "SWB",
                "IGM Filed",
                "CHA",
                "Description",
                "Actions",
                "Delivery Order",
                "Freight Certificate",
              ].map((header, idx) => (
                <th key={idx} className="border px-3 py-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredBookings && filteredBookings.length > 0 ? (
              filteredBookings.map((booking, idx) => (
                <tr key={idx} className="hover:bg-gray-100">
                  <td className="border px-2 py-1">{booking.job_number}</td>
                  <td className="border px-2 py-1">{booking.nomination_date}</td>
                  <td className="border px-2 py-1">{booking.consignee_details}</td>
                  <td className="border px-2 py-1">{booking.shipper_details}</td>
                  <td className="border px-2 py-1">{booking.hbl_no}</td>
                  <td className="border px-2 py-1">{booking.mbl_no}</td>
                  <td className="border px-2 py-1">{booking.pol}</td>
                  <td className="border px-2 py-1">{booking.pod}</td>
                  <td className="border px-2 py-1">{booking.container_size}</td>
                  <td className="border px-2 py-1">{booking.agent_details}</td>
                  <td className="border px-2 py-1">{booking.shipping_line}</td>
                  <td className="border px-2 py-1">{booking.buy_rate}</td>
                  <td className="border px-2 py-1">{booking.sell_rate}</td>
                  <td className="border px-2 py-1">{booking.etd}</td>
                  <td className="border px-2 py-1">{booking.eta}</td>
                  <td className="border px-2 py-1">{booking.swb}</td>
                  <td className="border px-2 py-1">{booking.igm_filed}</td>
                  <td className="border px-2 py-1">{booking.cha}</td>
                  <td className="border px-2 py-1">{booking.description_box}</td>

                  {/* Action Buttons */}
                  <td className="border px-2 py-1">
                    <a
                      href={`/edit-booking/${booking.job_number}`}
                      className="bg-yellow-400 hover:bg-yellow-500 px-2 py-1 rounded-md text-black"
                      onClick={(e) =>
                        window.confirm("Are you sure you want to edit this?")
                      }
                    >
                      Edit
                    </a>
                  </td>
                  <td className="border px-2 py-1">
                    <a
                      href={`/booking-status/${booking.job_number}`}
                      className="bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded-md text-white"
                    >
                      Preview
                    </a>
                  </td>
                  <td className="border px-2 py-1">
                    <a
                      href={`/freight-certificate/${booking.job_number}`}
                      className="bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded-md text-white"
                    >
                      Preview
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="23" className="border px-2 py-4 text-center">
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer Buttons */}
        <div className="flex flex-col md:flex-row justify-center gap-4 mt-6">
          <a
            href="/"
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-xl transition"
          >
            Back to Home
          </a>
          <a
            href="/booking-status"
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-xl transition"
          >
            Check Status
          </a>
        </div>
      </div>
    </div>
  );
};

export default Bookings;
