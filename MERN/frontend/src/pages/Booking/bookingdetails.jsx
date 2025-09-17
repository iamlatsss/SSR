import React, { useState } from "react";
import Navbar from "../NavBar/navbar"; 

const Bookingdetails = () => {
  const [form, setForm] = useState({
    job_number: "101", // static example
    nomination_date: "",
    consignee_details: "",
    shipper_details: "",
    hbl_no: "",
    mbl_no: "",
    pol: "",
    pod: "",
    container_size: "20ft",
    agent_details: "",
    shipping_line: "",
    buy_rate: "",
    sell_rate: "",
    etd: "",
    eta: "",
    swb: "yes",
    igm_filed: "yes",
    cha: "",
    description_box: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", form);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-20">
      <Navbar />

      <div className="max-w-5xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl">
        <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
          📋 Booking Details
        </h3>
        <hr className="mb-6" />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* First row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block mb-1 font-medium">Job Number</label>
              <input
                type="text"
                name="job_number"
                value={form.job_number}
                readOnly
                className="w-full border rounded p-2 bg-gray-100"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Nomination Date</label>
              <input
                type="date"
                name="nomination_date"
                value={form.nomination_date}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Consignee Details</label>
              <input
                type="text"
                name="consignee_details"
                value={form.consignee_details}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            </div>
          </div>

          {/* Second row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block mb-1 font-medium">Shipper Details</label>
              <input
                type="text"
                name="shipper_details"
                value={form.shipper_details}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">HBL No.</label>
              <input
                type="text"
                name="hbl_no"
                value={form.hbl_no}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">MBL No.</label>
              <input
                type="text"
                name="mbl_no"
                value={form.mbl_no}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            </div>
          </div>

          {/* More fields */}
          <div>
            <label className="block mb-1 font-medium">Port of Loading (POL)</label>
            <input
              type="text"
              name="pol"
              value={form.pol}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Enter POL"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Port of Discharge (POD)</label>
            <input
              type="text"
              name="pod"
              value={form.pod}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Enter POD"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Size of Container</label>
            <select
              name="container_size"
              value={form.container_size}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            >
              <option value="20ft">20'GP</option>
              <option value="40ft">20'HQ</option>
              <option value="40ft">40'DRY</option>
              <option value="40ft">40'HQ</option>
              <option value="40ft">20'Reefer</option>
              <option value="40ft">40'Reefer</option>
              <option value="40ft">20'Flat rack</option>
              <option value="40ft">40'Flat rack</option>
              <option value="40ft">20'Open top</option>
              <option value="40ft">40'Open top</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Agent Details</label>
            <input
              type="text"
              name="agent_details"
              value={form.agent_details}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Enter Agent Details"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Shipping Line</label>
            <input
              type="text"
              name="shipping_line"
              value={form.shipping_line}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Enter Shipping Line"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Buy Rate</label>
            <input
              type="number"
              name="buy_rate"
              value={form.buy_rate}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Enter Buy Rate"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Sell Rate</label>
            <input
              type="number"
              name="sell_rate"
              value={form.sell_rate}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Enter Sell Rate"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">ETD</label>
            <input
              type="date"
              name="etd"
              value={form.etd}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">ETA</label>
            <input
              type="date"
              name="eta"
              value={form.eta}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">SWB</label>
            <select
              name="swb"
              value={form.swb}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">IGM Filed</label>
            <select
              name="igm_filed"
              value={form.igm_filed}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">CHA</label>
            <input
              type="text"
              name="cha"
              value={form.cha}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Enter CHA Details"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Description Box</label>
            <textarea
              name="description_box"
              value={form.description_box}
              onChange={handleChange}
              className="w-full border rounded p-2 resize-none"
              rows={4}
              placeholder="Enter Query..."
            />
          </div>

          {/* Submit */}
          <div className="text-center">
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Bookingdetails;
