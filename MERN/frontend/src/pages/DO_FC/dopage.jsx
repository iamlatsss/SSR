import React, { useState, useEffect } from "react";
import Navbar from "../NavBar/navbar";

const DOPage = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedDO, setSelectedDO] = useState(null);

  // Simulate fetching pending bookings
  useEffect(() => {
    // Dummy data to mimic API response
    const dummyBookings = [
      {
        id: 1,
        jobNo: "JOB001",
        consignee: "ABC Traders",
        shipper: "XYZ Exports",
        pol: "Mumbai",
        pod: "Dubai",
        status: "pending",
        doUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
      },
      {
        id: 2,
        jobNo: "JOB002",
        consignee: "Global Imports",
        shipper: "Fast Shippers",
        pol: "Chennai",
        pod: "Singapore",
        status: "pending",
        doUrl: "https://www.africau.edu/images/default/sample.pdf"
      }
    ];

    // Mimic async fetch
    setTimeout(() => setBookings(dummyBookings), 500);
  }, []);

  const handlePreview = (doUrl) => {
    setSelectedDO(doUrl);
  };

  return (
    <div className="p-30">
      <Navbar />
      <h2 className="text-2xl font-bold mb-4">Pending Bookings - DO Preview</h2>

      {/* Bookings Table */}
      <table className="min-w-full border border-gray-300 mb-6">
        <thead>
          <tr className="bg-black-200" >
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
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  onClick={() => handlePreview(booking.doUrl)}
                >
                  DO Preview
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Iframe Preview */}
      {selectedDO && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">Delivery Order Preview</h3>
          <iframe
            src={selectedDO}
            title="DO Preview"
            width="100%"
            height="600px"
            className="border border-gray-400"
          ></iframe>
        </div>
      )}
    </div>
  );
};

export default DOPage;
