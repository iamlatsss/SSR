import React from "react";
import { Plus, Trash2, Lock } from "lucide-react";
import SearchableDropdown from "./SearchableDropdown";

const CHARGE_TYPES = ["Ocean Freight", "Terminal Handling Charges (THC)", "CFS Charges", "DO Charges", "Inland Haulage", "Customs Clearance", "Documentation Charges", "Surveyor Charges", "Storage/Demurrage", "Other Charges"];
const UNITS = ["--- None ---", "20", "20 DC", "20 F/R", "20 OT", "40", "40 F/R", "40 HQ", "40 OT", "CBM", "FLAT", "MAX WT/CBM", "PERCENT", "Wt"];
const CURRENCIES = ["USD", "INR", "EUR", "AED"];
const GST_PERCENTAGES = ["0%", "5%", "12%", "18%"];
const CONTAINER_GRID_TYPES = ["20 GP", "40 GP", "40 HC", "20 RF", "40 RF", "20 OT", "40 OT", "20 FR", "40 FR"];
const PACKAGE_TYPES = [
  "BAGS", "BAILS", "BALES", "BARREL", "BOXES", "BULK", "BUNDLE", "CANS", "CARBOYS",
  "CARTONS", "CASES", "CHEST", "COILS", "COLLIES", "CONTAINER", "CRATES", "CYLINDER",
  "DRUMS", "FLASK", "FLEXITANKS", "FUTS", "HABBUCK", "IBC TOTES", "INGOT", "JOTTA",
  "JUMBLE BALE", "KEGGS", "LIFT", "LOGS", "PACKAGES", "PALLETS", "PALLS", "QUADS",
  "REELS", "ROLLS", "ROOLS", "SHIPPERS", "SKID & SKIDDED PKGS", "SLABS", "STEEL BLOCKS",
  "STEEL BULKS", "STEEL ENVELOPES", "TABLE", "TINS", "TRUNK", "UNITS", "WOODEN BOXES",
  "WOODEN CASES"
];

/* =========================================================================
   1. RATE GRID COMPONENT (Used for both Buy Rates and Sell Rates)
   ========================================================================= */
export function RateGrid({ rows = [], onChange, onAddRow, onDeleteRow, customers = [], isBuy = true, consignee = "", chargeOptions = [], errors = [] }) {
  const partyLabel = isBuy ? "Vendor" : "Client";
  const finalCharges = chargeOptions && chargeOptions.length > 0 ? chargeOptions.map(c => c.name) : CHARGE_TYPES;

  const [activeRowIdx, setActiveRowIdx] = React.useState(0);

  const getCellClass = (idx, fieldName) => {
    const hasError = errors && errors[idx] && errors[idx][fieldName];
    if (hasError) {
      return "border-2 border-red-500 bg-red-50/10 dark:bg-red-950/10 focus-within:ring-2 focus-within:ring-red-500";
    }
    return "border border-slate-200 dark:border-slate-700/80";
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;

    if (field === "charge") {
      const selectedCharge = chargeOptions.find(c => c.name === value);
      if (selectedCharge) {
        if (selectedCharge.percentage !== undefined && selectedCharge.percentage !== null) {
          updated[index].gst = `${selectedCharge.percentage}%`;
        } else {
          updated[index].gst = "0%";
        }
        updated[index].sac = selectedCharge.sac || "";
        updated[index].hsn_sac = selectedCharge.sac || "";
      }
    }

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

  // Helper to parse city/state from custom addresses
  const parseCityState = (addressText) => {
    if (!addressText) return { city: "—", state: "—" };
    const parts = addressText.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return { city: "—", state: "—" };
    
    const states = [
      "Maharashtra", "Karnataka", "Tamil Nadu", "Delhi", "Gujarat", "West Bengal", 
      "Telangana", "Andhra Pradesh", "Uttar Pradesh", "Haryana", "Punjab", "Kerala",
      "Rajasthan", "Madhya Pradesh", "Bihar", "Odisha", "Assam"
    ];
    
    let foundState = "—";
    let foundCity = "—";
    
    for (const s of states) {
      const idx = parts.findIndex(p => p.toLowerCase().includes(s.toLowerCase()));
      if (idx !== -1) {
        foundState = s;
        if (idx > 0 && parts[idx - 1]) {
          foundCity = parts[idx - 1].replace(/\d+/g, '').trim() || "—";
        }
        break;
      }
    }
    
    if (foundState === "—" && parts.length >= 2) {
      foundState = parts[parts.length - 1] || "—";
      foundCity = parts[parts.length - 2] || "—";
    }
    
    return { city: foundCity, state: foundState };
  };

  // GST summary panel values computation
  const activeRow = rows[activeRowIdx] || rows[0] || null;
  const activeClient = activeRow ? customers.find(c => String(c.customer_id) === String(activeRow.party) || c.name === activeRow.party) : null;
  const activeGSTIN = activeClient?.gstin || "—";
  const activeAddress = activeRow?.address || "—";
  const { city, state } = parseCityState(activeAddress);
  const activeGstRateStr = activeRow?.gst || "0%";
  const activeGstRate = parseFloat(activeGstRateStr) || 0;
  const activeAmtFc = activeRow ? (parseFloat(activeRow.amt_fc) || 0) : 0; // INR Amount
  
  // Splits
  const isMaharashtra = activeGSTIN.startsWith("27") || activeAddress.toLowerCase().includes("maharashtra");
  const taxAmount = activeAmtFc * (activeGstRate / 100);
  
  let cgstRate = "0%";
  let sgstRate = "0%";
  let igstRate = "0%";
  let cgstAmt = 0;
  let sgstAmt = 0;
  let igstAmt = 0;
  
  if (activeGstRate > 0) {
    if (isMaharashtra) {
      cgstRate = `${activeGstRate / 2}%`;
      sgstRate = `${activeGstRate / 2}%`;
      cgstAmt = taxAmount / 2;
      sgstAmt = taxAmount / 2;
    } else {
      igstRate = `${activeGstRate}%`;
      igstAmt = taxAmount;
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {isBuy ? "Buy Rates / Expenses" : "Sell Rates / Revenue"}
        </h4>
        <button
          type="button"
          onClick={() => {
            const defaultCharge = finalCharges[0] || "Ocean Freight";
            const selectedCharge = chargeOptions.find(c => c.name === defaultCharge);
            let defaultGst = "0%";
            if (selectedCharge) {
              if (selectedCharge.percentage !== undefined && selectedCharge.percentage !== null) {
                defaultGst = `${selectedCharge.percentage}%`;
              }
            }

            const defaultSac = selectedCharge?.sac || "";
            const newRow = {
              doc_type: "INV",
              drcr: "DR",
              party: !isBuy && consignee ? consignee : "",
              address: "",
              charge: defaultCharge,
              sac: defaultSac,
              hsn_sac: defaultSac,
              gst: defaultGst,
              unit: "--- None ---",
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
            setActiveRowIdx(rows.length); // Focus newly created row
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg text-xs font-semibold transition-colors"
        >
          <Plus size={14} /> Add Rate Row
        </button>
      </div>

      {/* 2. GST Summary Panel */}
      {activeRow && (
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-750 pb-2">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              GST Information (Active Row #{activeRowIdx + 1}: {activeRow.charge || "No Charge Selected"})
            </h5>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
              Auto-populated from selected KYC client address details
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-xs">
            <div className="flex flex-col bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold mb-0.5">City</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={city}>{city}</span>
            </div>
            <div className="flex flex-col bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold mb-0.5">State</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={state}>{state}</span>
            </div>
            <div className="flex flex-col bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold mb-0.5">GST No.</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate" title={activeGSTIN}>{activeGSTIN}</span>
            </div>
            <div className="flex flex-col bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold mb-0.5">GST Rate</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">{activeGstRateStr}</span>
            </div>
            <div className="flex flex-col bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold mb-0.5">CGST</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {cgstRate} <span className="text-[10px] text-slate-500 font-normal">(₹{cgstAmt.toFixed(2)})</span>
              </span>
            </div>
            <div className="flex flex-col bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold mb-0.5">SGST</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {sgstRate} <span className="text-[10px] text-slate-500 font-normal">(₹{sgstAmt.toFixed(2)})</span>
              </span>
            </div>
            <div className="flex flex-col bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold mb-0.5">IGST</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {igstRate} <span className="text-[10px] text-slate-500 font-normal">(₹{igstAmt.toFixed(2)})</span>
              </span>
            </div>
            <div className="flex flex-col bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mb-0.5">GST Amount</span>
              <span className="font-extrabold text-indigo-700 dark:text-indigo-300">₹{taxAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. ERP Fixed Layout Table Grid */}
      <div className="overflow-x-auto xl:overflow-x-visible border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-dark-card shadow-sm">
        <table className="w-full text-left border-collapse table-fixed text-xs min-w-[1250px] xl:min-w-full border border-slate-200 dark:border-slate-700/80">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold uppercase tracking-wider">
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[75px]">DRCR</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[130px]">{partyLabel}</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[140px]">Address</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[200px]">Charge</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[80px] text-center">HSN/SAC</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[65px] text-center">GST</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[80px]">Unit</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[50px] text-right">Qty</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[70px] text-right">Rate</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[60px]">Cur.</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[65px] text-right">Ex Rate</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[75px] text-right">Amount</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 w-[80px] text-right">AMT_FC</th>
              <th className="border border-slate-200 dark:border-slate-700/80 p-2 text-center w-[40px]">Act</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan="14" className="p-8 text-center text-slate-500 dark:text-slate-400 italic border border-slate-200 dark:border-slate-700/80">
                  No rate rows added yet. Click "Add Rate Row" to start.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => setActiveRowIdx(idx)}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors ${activeRowIdx === idx ? 'bg-indigo-50/10 dark:bg-indigo-950/10' : ''}`}
                >
                  <td className={`${getCellClass(idx, "drcr")} p-0`}>
                    <select
                      value={row.doc_type || row.drcr || "INV"}
                      disabled={!!row.locked}
                      onChange={(e) => {
                        handleRowChange(idx, "doc_type", e.target.value);
                        handleRowChange(idx, "drcr", e.target.value);
                      }}
                      className={`w-full h-full bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 border-0 outline-none p-2 text-slate-900 dark:text-white rounded-none focus:bg-indigo-50/20 dark:focus:bg-indigo-950/20 text-xs focus:ring-0 ${row.locked ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
                    >
                      <option value="INV">INV</option>
                      <option value="DR">DR</option>
                    </select>
                  </td>
                  <td className={`${getCellClass(idx, "party")} p-0`}>
                    <SearchableDropdown
                      options={customers.map((c) => ({ value: c.customer_id, label: c.name }))}
                      value={row.party}
                      onChange={(val) => {
                        const updated = [...rows];
                        updated[idx].party = val;
                        updated[idx].address = "";
                        onChange(updated);
                      }}
                      placeholder={`Select ${partyLabel}`}
                      allowCustom={true}
                      variant="grid"
                      disabled={!!row.locked}
                    />
                  </td>
                  <td className={`${getCellClass(idx, "address")} p-0`}>
                    {(() => {
                      const clientData = customers.find(c => String(c.customer_id) === String(row.party) || c.name === row.party);
                      const addrs = [];
                      if (clientData) {
                        if (Array.isArray(clientData.addresses) && clientData.addresses.length > 0) {
                          clientData.addresses.forEach(addr => {
                            const line1 = addr.address_line1 || addr.address1 || '';
                            const line2 = addr.address_line2 || addr.address2 || '';
                            const clean = [line1, line2].map(p => p.trim()).filter(Boolean).join(', ');
                            if (clean) addrs.push(clean);
                          });
                        } else {
                          const clean = [
                            clientData.address_line1 || clientData.address1,
                            clientData.address_line2 || clientData.address2
                          ].map(p => p && p.trim()).filter(Boolean).join(', ');

                          if (clean) {
                            addrs.push(clean);
                          } else if (clientData.address && clientData.address.trim()) {
                            addrs.push(clientData.address.trim());
                          }
                        }
                      }
                      const unique = [...new Set(addrs)].map(addr => ({ value: addr, label: addr }));
                      if (row.address && !unique.some(opt => opt.value === row.address)) {
                        unique.push({ value: row.address, label: row.address });
                      }
                      return (
                        <SearchableDropdown
                          options={unique}
                          value={row.address}
                          onChange={(val) => handleRowChange(idx, "address", val)}
                          placeholder="Address"
                          allowCustom={true}
                          variant="grid"
                          disabled={!!row.locked}
                        />
                      );
                    })()}
                  </td>
                  <td className={`${getCellClass(idx, "charge")} p-0`}>
                    <SearchableDropdown
                      options={finalCharges.map(ch => ({ value: ch, label: ch }))}
                      value={row.charge}
                      onChange={(val) => handleRowChange(idx, "charge", val)}
                      showOnlyWhenTyping={true}
                      variant="grid"
                      disabled={!!row.locked}
                    />
                  </td>
                  <td className={`${getCellClass(idx, "hsn_sac")} p-0`}>
                    <input
                      type="text"
                      value={row.sac || row.hsn_sac || ""}
                      onChange={(e) => {
                        handleRowChange(idx, "sac", e.target.value);
                        handleRowChange(idx, "hsn_sac", e.target.value);
                      }}
                      disabled={!!row.locked}
                      placeholder="996521"
                      className={`w-full bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 border-0 outline-none p-2 text-slate-900 dark:text-white text-center rounded-none focus:bg-indigo-50/20 dark:focus:bg-indigo-950/20 text-xs focus:ring-0 ${row.locked ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
                    />
                  </td>
                  <td className={`${getCellClass(idx, "gst")} p-2 font-medium text-slate-700 dark:text-slate-350 text-center bg-slate-50/10 dark:bg-slate-800/10 text-xs`}>
                    {row.gst || "0%"}
                  </td>
                  <td className={`${getCellClass(idx, "unit")} p-0`}>
                    <SearchableDropdown
                      options={UNITS.map(u => ({ value: u, label: u }))}
                      value={row.unit}
                      onChange={(val) => handleRowChange(idx, "unit", val)}
                      variant="grid"
                      disabled={!!row.locked}
                    />
                  </td>
                  <td className={`${getCellClass(idx, "quantity")} p-0`}>
                    <input
                      type="number"
                      value={row.quantity || "1"}
                      onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                      disabled={!!row.locked}
                      className={`w-full bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 border-0 outline-none p-2 text-slate-900 dark:text-white text-right rounded-none focus:bg-indigo-50/20 dark:focus:bg-indigo-950/20 text-xs focus:ring-0 font-medium ${row.locked ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
                    />
                  </td>
                  <td className={`${getCellClass(idx, "rate")} p-0`}>
                    <input
                      type="number"
                      value={row.rate || "0"}
                      onChange={(e) => handleRowChange(idx, "rate", e.target.value)}
                      disabled={!!row.locked}
                      className={`w-full bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 border-0 outline-none p-2 text-slate-900 dark:text-white text-right rounded-none focus:bg-indigo-50/20 dark:focus:bg-indigo-950/20 text-xs focus:ring-0 font-medium ${row.locked ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
                    />
                  </td>
                  <td className={`${getCellClass(idx, "currency")} p-0`}>
                    <SearchableDropdown
                      options={CURRENCIES.map(curr => ({ value: curr, label: curr }))}
                      value={row.currency}
                      onChange={(val) => handleRowChange(idx, "currency", val)}
                      variant="grid"
                      disabled={!!row.locked}
                    />
                  </td>
                  <td className={`${getCellClass(idx, "ex_rate")} p-0`}>
                    <input
                      type="number"
                      value={row.ex_rate || "1"}
                      onChange={(e) => handleRowChange(idx, "ex_rate", e.target.value)}
                      disabled={!!row.locked}
                      className={`w-full bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 border-0 outline-none p-2 text-slate-900 dark:text-white text-right rounded-none focus:bg-indigo-50/20 dark:focus:bg-indigo-950/20 text-xs focus:ring-0 font-medium ${row.locked ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
                    />
                  </td>
                  <td className="border border-slate-200 dark:border-slate-700/80 p-2 text-right font-medium text-slate-750 dark:text-slate-350 bg-slate-50/10 dark:bg-slate-850/10 text-xs">
                    {row.amount || "0.00"}
                  </td>
                  <td className="border border-slate-200 dark:border-slate-700/80 p-2 text-right font-bold text-indigo-600 dark:text-indigo-400 bg-slate-50/10 dark:bg-slate-800/10 text-xs">
                    {row.amt_fc || "0.00"}
                  </td>
                  <td className="border border-slate-200 dark:border-slate-700/80 p-1 text-center">
                    {row.locked ? (
                      <span className="text-slate-400 dark:text-slate-500 p-1 flex items-center justify-center mx-auto" title="Locked (Tax Invoice Generated)">
                        <Lock size={14} className="text-slate-400 dark:text-slate-500" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDeleteRow(idx)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1 rounded transition-colors flex items-center justify-center mx-auto"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
            
            {/* 4. Column Totals Row */}
            {rows.length > 0 && (
              <tr className="bg-slate-100 dark:bg-slate-800/40 text-slate-800 dark:text-white font-bold border-t border-slate-200 dark:border-slate-700/80">
                <td colSpan="11" className="border border-slate-200 dark:border-slate-700/80 p-2 text-right text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  Totals:
                </td>
                <td className="border border-slate-200 dark:border-slate-700/80 p-2 text-right text-slate-900 dark:text-white font-bold bg-slate-100/30 dark:bg-slate-800/30 text-xs">
                  {rows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 dark:border-slate-700/80 p-2 text-right text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50/10 dark:bg-indigo-900/10 text-xs">
                  {rows.reduce((acc, r) => acc + (parseFloat(r.amt_fc) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-200 dark:border-slate-700/80 p-1"></td>
              </tr>
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
