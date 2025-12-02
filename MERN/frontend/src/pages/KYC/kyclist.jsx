import React, { useEffect, useState } from "react";
import Navbar from "../NavBar/navbar";

const KYCList = () => {
  const [kycEntries, setKycEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const resp = await fetchCustomers();
        // backend might return data in different keys; handle common shapes
        const list = resp?.data ?? resp?.consignee ?? resp ?? [];
        if (mounted) setKycEntries(Array.isArray(list) ? list : []);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to fetch customers.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);
  
  return (
    <div className="min-h-screen p-20">
      <Navbar />
      <div className="max-w-5xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl text-black">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          📄 KYC Details List
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse rounded-xl overflow-hidden shadow-lg">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold">Date</th>
                <th className="py-3 px-4 text-left text-sm font-semibold">Branch</th>
                <th className="py-3 px-4 text-left text-sm font-semibold">Customer Name</th>
                <th className="py-3 px-4 text-left text-sm font-semibold">Status</th>
                <th className="py-3 px-4 text-left text-sm font-semibold">GSTIN</th>
              </tr>
            </thead>

            <tbody className="text-gray-800">
              {kycEntries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={`${
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-blue-100 transition`}
                >
                  <td className="py-3 px-4 text-sm">{entry.date}</td>
                  <td className="py-3 px-4 text-sm">{entry.branch}</td>
                  <td className="py-3 px-4 text-sm">{entry.name}</td>
                  <td className="py-3 px-4 text-sm">{entry.status}</td>
                  <td className="py-3 px-4 text-sm">{entry.gstin}</td>
                </tr>
              ))}

              {kycEntries.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-6 text-gray-500 font-medium"
                  >
                    No KYC records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KYCList;
