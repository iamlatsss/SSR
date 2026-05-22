import React from "react";
import { Plus, Trash2 } from "lucide-react";

const CHARGE_TYPES = ["Ocean Freight", "Terminal Handling Charges (THC)", "CFS Charges", "DO Charges", "Inland Haulage", "Customs Clearance", "Documentation Charges", "Surveyor Charges", "Storage/Demurrage", "Other Charges"];
const UNITS = ["Per Container", "Per B/L", "CBM", "Metric Ton", "Flat", "Per Package"];
const CURRENCIES = ["USD", "INR", "EUR", "AED"];
const GST_PERCENTAGES = ["0%", "5%", "12%", "18%"];
const CONTAINER_GRID_TYPES = ["20 GP", "40 GP", "40 HC", "20 RF", "40 RF", "20 OT", "40 OT", "20 FR", "40 FR"];
const PACKAGE_TYPES = ["Pallet", "Carton", "Box", "Crate", "Drum", "Roll", "Bag", "Loose"];

/* =========================================================================
   1. RATE GRID COMPONENT (Used for both Buy Rates and Sell Rates)
   ========================================================================= */
export function RateGrid({ rows = [], onChange, onAddRow, onDeleteRow, customers = [], isBuy = true }) {
  const partyLabel = isBuy ? "Vendor" : "Client";

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;

    // Automatic Calculations
    if (field === "quantity" || field === "rate") {
      const q = parseFloat(updated[index].quantity) || 0;
      const r = parseFloat(updated[index].rate) || 0;
      updated[index].amount = (q * r).toFixed(2);
      
      const ex = parseFloat(updated[index].ex_rate) || 1;
      updated[index].amt_fc = (q * r * ex).toFixed(2);
    }

    if (field === "ex_rate") {
      const amt = parseFloat(updated[index].amount) || 0;
      const ex = parseFloat(value) || 1;
      updated[index].amt_fc = (amt * ex).toFixed(2);
    }

    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {isBuy ? "Buy Rates / Expenses" : "Sell Rates / Revenue"}
        </h4>
        <button
          type="button"
          onClick={() => {
            const newRow = {
              drcr: "DR",
              party: "",
              address: "",
              charge: "Ocean Freight",
              gst: "18%",
              unit: "Per Container",
              quantity: "1",
              rate: "0",
              currency: "USD",
              ex_rate: "1",
              amount: "0.00",
              amt_fc: "0.00",
              narration: "",
              group: ""
            };
            onAddRow(newRow);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg text-xs font-semibold transition-colors"
        >
          <Plus size={14} /> Add Rate Row
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-dark-card shadow-sm">
        <table className="w-full text-left border-collapse table-auto text-xs min-w-[1300px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <th className="p-3 w-16">DR/CR</th>
              <th className="p-3 w-48">{partyLabel}</th>
              <th className="p-3 w-36">Address</th>
              <th className="p-3 w-48">Charge</th>
              <th className="p-3 w-20">GST</th>
              <th className="p-3 w-32">Unit</th>
              <th className="p-3 w-16">Qty</th>
              <th className="p-3 w-24">Rate</th>
              <th className="p-3 w-20">Curr</th>
              <th className="p-3 w-20">Ex Rate</th>
              <th className="p-3 w-24">Amt (FC)</th>
              <th className="p-3 w-24">Amt (INR)</th>
              <th className="p-3 w-40">Narration</th>
              <th className="p-3 w-28">Group</th>
              <th className="p-3 text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan="15" className="p-8 text-center text-slate-500 dark:text-slate-400 italic">
                  No rate rows added yet. Click "Add Rate Row" to start.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="p-2">
                    <select
                      value={row.drcr || "DR"}
                      onChange={(e) => handleRowChange(idx, "drcr", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    >
                      <option value="DR">DR</option>
                      <option value="CR">CR</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      value={row.party || ""}
                      onChange={(e) => handleRowChange(idx, "party", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    >
                      <option value="">Select {partyLabel}</option>
                      {customers.map((c) => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.address || ""}
                      placeholder="Address"
                      onChange={(e) => handleRowChange(idx, "address", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={row.charge || "Ocean Freight"}
                      onChange={(e) => handleRowChange(idx, "charge", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    >
                      {CHARGE_TYPES.map(ch => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      value={row.gst || "18%"}
                      onChange={(e) => handleRowChange(idx, "gst", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    >
                      {GST_PERCENTAGES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      value={row.unit || "Per Container"}
                      onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    >
                      {UNITS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={row.quantity || "1"}
                      onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white text-right"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={row.rate || "0"}
                      onChange={(e) => handleRowChange(idx, "rate", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white text-right font-medium"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={row.currency || "USD"}
                      onChange={(e) => handleRowChange(idx, "currency", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    >
                      {CURRENCIES.map(curr => (
                        <option key={curr} value={curr}>{curr}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={row.ex_rate || "1"}
                      onChange={(e) => handleRowChange(idx, "ex_rate", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white text-right"
                    />
                  </td>
                  <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200 p-3 bg-slate-50/50 dark:bg-slate-850">
                    {row.amount || "0.00"}
                  </td>
                  <td className="p-2 text-right font-bold text-indigo-600 dark:text-indigo-400 p-3 bg-slate-50 dark:bg-slate-800">
                    {row.amt_fc || "0.00"}
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.narration || ""}
                      placeholder="Remarks / Narration"
                      onChange={(e) => handleRowChange(idx, "narration", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.group || ""}
                      placeholder="Group"
                      onChange={(e) => handleRowChange(idx, "group", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRow(idx)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="flex justify-end p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="text-right space-y-1">
            <span className="text-xs text-slate-500">Total Base Currency Revenue:</span>
            <div className="text-lg font-bold text-slate-800 dark:text-white">
              INR {rows.reduce((acc, r) => acc + (parseFloat(r.amt_fc) || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   2. CONTAINER GRID COMPONENT (Used in Inventory + Container tab)
   ========================================================================= */
export function ContainerGrid({ rows = [], onChange, onAddRow, onDeleteRow, disabled = false }) {
  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Individual Container Specifications
        </h4>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              const newRow = {
                container_no: "",
                container_type: "40 HC",
                seal_no: "",
                no_of_packages: "",
                package_type: "Pallet",
                gross_weight: ""
              };
              onAddRow(newRow);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus size={14} /> Add Container Row
          </button>
        )}
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-dark-card shadow-sm">
        <table className="w-full text-left border-collapse table-auto text-xs min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <th className="p-3">Container No</th>
              <th className="p-3">Container Type</th>
              <th className="p-3">Seal No</th>
              <th className="p-3">No of Packages</th>
              <th className="p-3">Package Type</th>
              <th className="p-3">Gross Weight (kg)</th>
              {!disabled && <th className="p-3 text-center w-12">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={disabled ? "6" : "7"} className="p-8 text-center text-slate-500 dark:text-slate-400 italic">
                  No containers listed yet. Click "Add Container Row" to append.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="p-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={row.container_no || ""}
                      placeholder="e.g. MSKU1849302"
                      onChange={(e) => handleRowChange(idx, "container_no", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white font-mono uppercase disabled:opacity-60"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      disabled={disabled}
                      value={row.container_type || "40 HC"}
                      onChange={(e) => handleRowChange(idx, "container_type", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white disabled:opacity-60"
                    >
                      {CONTAINER_GRID_TYPES.map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={row.seal_no || ""}
                      placeholder="e.g. SL940294"
                      onChange={(e) => handleRowChange(idx, "seal_no", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white disabled:opacity-60"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      disabled={disabled}
                      value={row.no_of_packages || ""}
                      placeholder="e.g. 50"
                      onChange={(e) => handleRowChange(idx, "no_of_packages", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white disabled:opacity-60 text-right"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      disabled={disabled}
                      value={row.package_type || "Pallet"}
                      onChange={(e) => handleRowChange(idx, "package_type", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white disabled:opacity-60"
                    >
                      {PACKAGE_TYPES.map(pt => (
                        <option key={pt} value={pt}>{pt}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      disabled={disabled}
                      value={row.gross_weight || ""}
                      placeholder="e.g. 12000"
                      onChange={(e) => handleRowChange(idx, "gross_weight", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white disabled:opacity-60 text-right"
                    />
                  </td>
                  {!disabled && (
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRow(idx)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================================
   3. VEHICLE DETAILS GRID COMPONENT
   ========================================================================= */
export function VehicleGrid({ rows = [], onChange, onAddRow, onDeleteRow }) {
  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Vehicle & Driver Tracking Information
        </h4>
        <button
          type="button"
          onClick={() => {
            const newRow = {
              vehicle_no: "",
              driver_name: "",
              driver_phone: "",
              license_no: "",
              transporter_name: "",
              loading_date: "",
              unloading_date: "",
              remarks: ""
            };
            onAddRow(newRow);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg text-xs font-semibold transition-colors"
        >
          <Plus size={14} /> Add Vehicle Row
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-dark-card shadow-sm">
        <table className="w-full text-left border-collapse table-auto text-xs min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <th className="p-3">Vehicle No</th>
              <th className="p-3">Driver Name</th>
              <th className="p-3">Driver Phone</th>
              <th className="p-3">License No</th>
              <th className="p-3">Transporter</th>
              <th className="p-3">Loading Date</th>
              <th className="p-3">Unloading Date</th>
              <th className="p-3">Remarks</th>
              <th className="p-3 text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-8 text-center text-slate-500 dark:text-slate-400 italic">
                  No vehicles assigned to this shipment. Click "Add Vehicle Row" to register.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.vehicle_no || ""}
                      placeholder="e.g. MH-43-AL-9284"
                      onChange={(e) => handleRowChange(idx, "vehicle_no", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white uppercase font-semibold"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.driver_name || ""}
                      placeholder="Driver Name"
                      onChange={(e) => handleRowChange(idx, "driver_name", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.driver_phone || ""}
                      placeholder="Driver Contact"
                      onChange={(e) => handleRowChange(idx, "driver_phone", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.license_no || ""}
                      placeholder="License No"
                      onChange={(e) => handleRowChange(idx, "license_no", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.transporter_name || ""}
                      placeholder="Transporter Name"
                      onChange={(e) => handleRowChange(idx, "transporter_name", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="date"
                      value={row.loading_date ? row.loading_date.slice(0, 10) : ""}
                      onChange={(e) => handleRowChange(idx, "loading_date", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="date"
                      value={row.unloading_date ? row.unloading_date.slice(0, 10) : ""}
                      onChange={(e) => handleRowChange(idx, "unloading_date", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.remarks || ""}
                      placeholder="Remarks"
                      onChange={(e) => handleRowChange(idx, "remarks", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRow(idx)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
