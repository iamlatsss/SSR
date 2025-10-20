// src/pages/KYCList.js
import React, { useEffect, useState } from "react";
import Navbar from "../NavBar/navbar";

const KYCList = () => {
  const [kycEntries, setKycEntries] = useState([]);

  useEffect(() => {
    fetch("/api/get_kyc_list") // Replace with your API endpoint
      .then(response => response.json())
      .then(data => setKycEntries(data));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-25">
      <Navbar />
      <h2 className="text-2xl font-semibold mb-6">KYC Details List</h2>
      <table className="table-fixed w-full bg-gray-800 text-white">
        <thead>
          <tr>
            <th>Date</th>
            <th>Branch</th>
            <th>Customer Name</th>
            <th>Status</th>
            <th>GSTIN</th>
          </tr>
        </thead>
        <tbody>
          {kycEntries.map(entry => (
            <tr key={entry.id}>
              <td>{entry.date}</td>
              <td>{entry.branch}</td>
              <td>{entry.name}</td>
              <td>{entry.status}</td>
              <td>{entry.gstin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KYCList;
