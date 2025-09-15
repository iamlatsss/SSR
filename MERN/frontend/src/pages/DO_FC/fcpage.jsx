import React, { useState, useEffect } from "react";
import Navbar from "../NavBar/navbar";

const FCPage = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedFC, setSelectedFC] = useState(null);

  // Simulate fetching bookings with dummy data
  useEffect(() => {
    const dummyBookings = [
      {
        id: 101,
        jobNo: "JOB101",
        consignee: "Sunrise Imports",
        shipper: "Hebei Altway Co. Ltd.",
        pol: "Tianjin, China",
        pod: "Nhava Sheva, India",
        status: "pending",
        fcUrl: "https://www.africau.edu/images/default/sample.pdf" // sample preview file
      },
      {
        id: 102,
        jobNo: "JOB102",
        consignee: "Zoshab Intl. Power Tools",
        shipper: "SSR Logistics",
        pol: "Shanghai",
        pod: "Mumbai",
        status: "pending",
        fcUrl: "http://localhost:5173/FCpage"
      }
    ];

    setTimeout(() => setBookings(dummyBookings), 500);
  }, []);

  const handlePreview = (fcUrl) => {
    setSelectedFC(fcUrl);
  };

  return (
    <div className="p-30">
      <Navbar />
      <h2 className="text-2xl font-bold mb-4">
        Pending Bookings - Freight Certificate Preview
      </h2>

      {/* Bookings Table */}
      <table className="min-w-full border border-gray-300 mb-6">
        <thead>
          <tr className="bg-black-200">
            <th className="border p-2">Job No.</th>
            <th className="border p-2">Consignee</th>
            <th className="border p-2">Shipper</th>
            <th className="border p-2">POL</th>
            <th className="border p-2">POD</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td className="border p-2">{booking.jobNo}</td>
              <td className="border p-2">{booking.consignee}</td>
              <td className="border p-2">{booking.shipper}</td>
              <td className="border p-2">{booking.pol}</td>
              <td className="border p-2">{booking.pod}</td>
              <td className="border p-2">{booking.status}</td>
              <td className="border p-2">
                <button
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  onClick={() => handlePreview(booking.fcUrl)}
                >
                  Freight Certificate Preview
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Iframe Preview */}
      {selectedFC && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">
            Freight Certificate Preview
          </h3>
          <iframe
            src={selectedFC}
            title="Freight Certificate Preview"
            width="100%"
            height="600px"
            className="border border-gray-400"
          ></iframe>
        </div>
      )}
    </div>
  );
};

export default FCPage;
