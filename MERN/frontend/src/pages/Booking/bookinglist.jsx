import React from "react";
import Navbar from "../NavBar/navbar";
import Bookingdetails from "./bookingdetails";

const Bookings = ({ bookings }) => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-sky-300 via-white to-white p-6">
      <Navbar />

      <div className="max-w-full mx-auto mt-8 bg-white rounded-3xl shadow-2xl p-6 overflow-x-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-3xl font-bold text-gray-800 text-center md:text-left">
            🧾 All Booking Entries
          </h2>
          <a
            href="/booking"
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-xl shadow-lg transition"
          >
            + Add New Booking
          </a>
        </div>

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
                "Delete",
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
            {bookings && bookings.length > 0 ? (
              bookings.map((booking, idx) => (
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
                      href={`/delete-booking/${booking.job_number}`}
                      className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded-md text-white"
                      onClick={(e) =>
                        window.confirm("Are you sure you want to delete this booking?")
                      }
                    >
                      Delete
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
                  No bookings available
                </td>
              </tr>
            )}
          </tbody>
        </table>

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
