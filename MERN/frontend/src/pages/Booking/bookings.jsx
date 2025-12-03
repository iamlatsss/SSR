import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../NavBar/navbar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const containerSizeOptions = ["20", "40", "20'HQ", "40'HQ", "20'Reefer", "40'Reefer"];

const servicesOptions = ["FF - Freight Forwarding", "Air Freight", "Sea Import", "Sea Export"];
const shipmentTypeOptions = ["LCL", "FCL", "Bulk"];
const incotermsOptions = ["CIF", "FOB", "EXW", "DAP"];
const blTypeOptions = ["Original", "Copy", "Surrendered"];
const freightStatusOptions = ["Select HBL Status", "Pending", "Cleared"];
const manifestFillingOptions = ["Select Manifest Filling", "Manifest A", "Manifest B"];
const cfsFillingOptions = ["Select CFS Filling", "CFS A", "CFS B"];
const branchOptions = ["Mumbai", "Delhi", "Kolkata"];
const gstStateOptions = ["Maharashtra", "Karnataka", "Tamil Nadu"];

const defaultMain = {
  job_no: "",
  job_date: "",
  services: "FF - Freight Forwarding",
  shipment_type: "LCL",
  mbl_no: "",
  mbl_date: "",
  incoterms: "CIF",
  client: "",
  sales: "",
  cs: "",
  freight_status: "",
  bl_type: "Original",
  vessel: "",
  voyage: "",
  por: "",
  pol: "",
  pod: "",
  fpd: "",
  boe_no: "",
  cfs: "",
  item_no: "",
  sub_no: "",
  igm_no: "",
  igm_date: "",
  eta: "",
  etd: "",
  reference_no: "",
  manifest_filling: "",
  cfs_filling: "",
  branch_code: "Mumbai",
  execution_branch: "Mumbai",
  gst_state_from: "Maharashtra",
};

const defaultParty = { consignee: "", carrier: "", line: "", shipper: "", notify: "", agent: "", transporter: "", cha_name: "" };
const defaultPackages = { no_of_packages: "", package_type: "", no_of_pallets: "", gross_weight: "", net_weight: "", volume: "" };
const defaultInventory = { items: [] };
const defaultContainers = { containers: [] };
const defaultDescription = { marks_nos: "", description: "", remarks: "" };
const defaultRates = { rows: [] };
const defaultVehicle = { vehicle_no: "", driver_name: "", transport_company: "" };

export default function BookingEditorWithTabsFinal() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [main, setMain] = useState(defaultMain);
  const [party, setParty] = useState(defaultParty);
  const [packages, setPackages] = useState(defaultPackages);
  const [inventory, setInventory] = useState(defaultInventory);
  const [containers, setContainers] = useState(defaultContainers);
  const [description, setDescription] = useState(defaultDescription);
  const [buyRates, setBuyRates] = useState(defaultRates);
  const [sellRates, setSellRates] = useState(defaultRates);
  const [vehicle, setVehicle] = useState(defaultVehicle);

  const [activeTab, setActiveTab] = useState("Main");
  const [consignees, setConsignees] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/kyc/");
        const j = await r.json();
        if (j.success) setConsignees(j.data || []);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/booking/get/${jobId}`);
        const j = await r.json();
        const b = j.success ? j.data : j;
        if (!b) throw new Error("No booking returned");

        // Map backend fields to main
        setMain((m) => ({
          ...m,
          job_no: b.job_no ?? b.JobNo ?? m.job_no,
          job_date: b.job_date ?? b.JobDate ?? m.job_date,
          services: b.services ?? m.services,
          shipment_type: b.shipment_type ?? m.shipment_type,
          mbl_no: b.mbl_no ?? b.MBL_No ?? m.mbl_no,
          mbl_date: b.mbl_date ?? m.mbl_date,
          incoterms: b.incoterms ?? m.incoterms,
          client: b.client ?? b.client_name ?? m.client,
          sales: b.sales ?? m.sales,
          cs: b.cs ?? m.cs,
          freight_status: b.freight_status ?? m.freight_status,
          bl_type: b.bl_type ?? m.bl_type,
          vessel: b.vessel ?? m.vessel,
          voyage: b.voyage ?? m.voyage,
          por: b.por ?? b.POR ?? m.por,
          pol: b.pol ?? b.POL ?? m.pol,
          pod: b.pod ?? b.POD ?? m.pod,
          fpd: b.fpd ?? m.fpd,
          boe_no: b.boe_no ?? b.BOE_No ?? m.boe_no,
          cfs: b.cfs ?? m.cfs,
          item_no: b.item_no ?? m.item_no,
          sub_no: b.sub_no ?? m.sub_no,
          igm_no: b.igm_no ?? m.igm_no,
          igm_date: b.igm_date ?? m.igm_date,
          eta: b.eta ?? m.eta,
          etd: b.etd ?? m.etd,
          reference_no: b.reference_no ?? b.ReferenceNo ?? m.reference_no,
          manifest_filling: b.manifest_filling ?? m.manifest_filling,
          cfs_filling: b.cfs_filling ?? m.cfs_filling,
          branch_code: b.branch_code ?? m.branch_code,
          execution_branch: b.execution_branch ?? m.execution_branch,
          gst_state_from: b.gst_state_from ?? m.gst_state_from,
        }));

        // map other tabs (unchanged)
        setParty((p) => ({ ...p, consignee: b.consignee ?? p.consignee, shipper: b.shipper ?? p.shipper, carrier: b.carrier ?? p.carrier, notify: b.notify ?? p.notify, agent: b.agent ?? p.agent, transporter: b.transporter ?? p.transporter, cha_name: b.cha_name ?? p.cha_name }));
        setPackages((pk) => ({ ...pk, no_of_packages: b.no_of_packages ?? pk.no_of_packages, package_type: b.package_type ?? pk.package_type, no_of_pallets: b.no_of_pallets ?? pk.no_of_pallets, gross_weight: b.gross_weight ?? pk.gross_weight, net_weight: b.net_weight ?? pk.net_weight, volume: b.volume ?? pk.volume }));
        setInventory({ items: b.inventory_items || b.inventory || [] });
        setContainers({ containers: b.containers || b.container_list || [] });
        setDescription({ marks_nos: b.marks_nos || "", description: b.description || "", remarks: b.remarks || "" });
        setBuyRates({ rows: b.buy_rates || [] });
        setSellRates({ rows: b.sell_rates || [] });
        setVehicle({ vehicle_no: b.vehicle_no || "", driver_name: b.driver_name || "", transport_company: b.transport_company || "" });
      } catch (err) {
        toast.error("Failed to load booking: " + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  // Helper update functions
  const updateMain = (key, val) => setMain((m) => ({ ...m, [key]: val }));
  const updateParty = (key, val) => setParty((p) => ({ ...p, [key]: val }));
  const updatePackages = (key, val) => setPackages((p) => ({ ...p, [key]: val }));
  const updateDescription = (key, val) => setDescription((d) => ({ ...d, [key]: val }));
  const updateVehicle = (key, val) => setVehicle((v) => ({ ...v, [key]: val }));

  // inventory, containers, rates helpers (same as before)
  const addInventoryRow = () => setInventory((inv) => ({ items: [...(inv.items || []), { container_type: "20", units: 1, csize: "20" }] }));
  const removeInventoryRow = (idx) => setInventory((inv) => ({ items: (inv.items || []).filter((_, i) => i !== idx) }));
  const updateInventoryAt = (idx, field, value) => setInventory((inv) => { const c = [...(inv.items||[])]; c[idx] = { ...c[idx], [field]: value }; return { items: c }; });

  const addContainer = () => setContainers((c) => ({ containers: [...(c.containers || []), { container_no: "", container_type: "20", seal_no: "", no_of_packages: 1, package_type: "PALLETS", gross_weight: "" }] }));
  const removeContainerAt = (idx) => setContainers((c) => ({ containers: (c.containers || []).filter((_, i) => i !== idx) }));
  const updateContainerAt = (idx, field, value) => setContainers((c) => { const cp = [...(c.containers || [])]; cp[idx] = { ...cp[idx], [field]: value }; return { containers: cp }; });

  const addRateRow = (which) => {
    const newRow = { drcr: "Inv", client: "", address: "", charge: "", gst: "", unit: "", quantity: 1, rate: 0, currency: "INR", ex_rate: 1, amount: 0, amt_fc: 0, narration: "", group: "" };
    if (which === "buy") setBuyRates((r) => ({ rows: [...(r.rows || []), newRow] }));
    else setSellRates((r) => ({ rows: [...(r.rows || []), newRow] }));
  };
  const removeRateRow = (which, idx) => {
    if (which === "buy") setBuyRates((r) => ({ rows: (r.rows || []).filter((_, i) => i !== idx) }));
    else setSellRates((r) => ({ rows: (r.rows || []).filter((_, i) => i !== idx) }));
  };
  const updateRateAt = (which, idx, field, value) => {
    const updater = (r) => { const cp = [...(r.rows || [])]; cp[idx] = { ...(cp[idx] || {}), [field]: value }; const q = Number(cp[idx].quantity) || 0; const rate = Number(cp[idx].rate) || 0; const ex = Number(cp[idx].ex_rate) || 1; cp[idx].amount = +(q * rate * ex).toFixed(2); cp[idx].amt_fc = +(q * rate).toFixed(2); return { rows: cp } };
    if (which === "buy") setBuyRates((r) => updater(r)); else setSellRates((r) => updater(r));
  };
  const totalAmount = (which) => { const rows = which === "buy" ? (buyRates.rows || []) : (sellRates.rows || []); return rows.reduce((s, r) => s + (Number(r.amount) || 0), 0).toFixed(2); };

  // Save helpers
  const saveTab = async (tab) => {
    setSaving(true);
    try {
      const payload = (() => {
        switch (tab) {
          case "Main": return { main };
          case "Party": return { party };
          case "Packages": return { packages };
          case "Inventory": return { inventory };
          case "Container": return { containers };
          case "Description": return { description };
          case "BuyRates": return { buyRates };
          case "SellRates": return { sellRates };
          case "Vehicle": return { vehicle };
          default: return {};
        }
      })();

      const url = jobId ? `/api/booking/update/${jobId}` : `/api/booking/create`;
      const method = jobId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.error||"Save failed"); }
      const js = await res.json();
      toast.success(`${tab} saved`);
      if (!jobId && js.job_no) navigate(`/bookings/edit/${js.job_no}`);
    } catch (err) {
      toast.error("Save error: " + err.message);
    } finally { setSaving(false); }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const payload = { main, party, packages, inventory, containers, description, buyRates, sellRates, vehicle };
      const url = jobId ? `/api/booking/update/${jobId}` : `/api/booking/create`;
      const method = jobId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.error||"Save failed"); }
      const js = await res.json();
      toast.success("Saved all tabs");
      if (!jobId && js.job_no) navigate(`/bookings/edit/${js.job_no}`);
    } catch (err) { toast.error("Save all error: " + err.message); } finally { setSaving(false); }
  };

  const tabs = ["Main","Party","Packages","Inventory","Container","Description","BuyRates","SellRates","Vehicle"];

  return (
    <div className="min-h-screen p-20">
        <Navbar />
        <div className="max-w-5xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl text-black">
          <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
            Job Bookings
          </h3>
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white p-4 rounded shadow mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Edit Sea Master BL Job {main.job_no ? `#${main.job_no}` : "(new)"}</h2>
            <div className="text-sm text-slate-500">{main.client}</div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded" onClick={() => window.print()}>Print</button>
            <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={saveAll} disabled={saving}>{saving ? 'Saving...' : 'Save All'}</button>
          </div>
        </div>

        <div className="bg-white rounded shadow mb-4">
          <div className="border-b">
            <nav className="flex gap-1 px-2">
              {tabs.map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-2 text-sm rounded-t ${activeTab===t ? 'bg-white border-t border-l border-r -mb-px' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {t}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'Main' && (
              <div className="space-y-4">
                {/* Row 1: Job No, Job Date, Services, Shipment Type */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Job No</label>
                    <input value={main.job_no} onChange={(e)=>updateMain('job_no', e.target.value)} className="w-full border rounded p-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Job Date</label>
                    <input type="date" value={main.job_date} onChange={(e)=>updateMain('job_date', e.target.value)} className="w-full border rounded p-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Services</label>
                    <select value={main.services} onChange={(e)=>updateMain('services', e.target.value)} className="w-full border rounded p-2">
                      {servicesOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Shipment Type</label>
                    <select value={main.shipment_type} onChange={(e)=>updateMain('shipment_type', e.target.value)} className="w-full border rounded p-2">
                      {shipmentTypeOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 2: MBL_No, MBL Date, INCO Terms, Client */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium">MBL_No</label>
                    <input value={main.mbl_no} onChange={(e)=>updateMain('mbl_no', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">MBL Date</label>
                    <input type="date" value={main.mbl_date} onChange={(e)=>updateMain('mbl_date', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">INCO Terms</label>
                    <select value={main.incoterms} onChange={(e)=>updateMain('incoterms', e.target.value)} className="w-full border rounded p-2">
                      {incotermsOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Client</label>
                    <input value={main.client} onChange={(e)=>updateMain('client', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                </div>

                {/* Row 3: Sales, CS, Freight Status, BL Type */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Sales</label>
                    <input value={main.sales} onChange={(e)=>updateMain('sales', e.target.value)} className="w-full border rounded p-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium">CS</label>
                    <input value={main.cs} onChange={(e)=>updateMain('cs', e.target.value)} className="w-full border rounded p-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Freight Status</label>
                    <select value={main.freight_status} onChange={(e)=>updateMain('freight_status', e.target.value)} className="w-full border rounded p-2">
                      {freightStatusOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium">BL Type</label>
                    <select value={main.bl_type} onChange={(e)=>updateMain('bl_type', e.target.value)} className="w-full border rounded p-2">
                      {blTypeOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 4: Vessel, Voyage, POR, POL */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Vessel</label>
                    <input value={main.vessel} onChange={(e)=>updateMain('vessel', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Voyage</label>
                    <input value={main.voyage} onChange={(e)=>updateMain('voyage', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">P.O.R</label>
                    <input value={main.por} onChange={(e)=>updateMain('por', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">P.O.L</label>
                    <input value={main.pol} onChange={(e)=>updateMain('pol', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                </div>

                {/* Row 5: P.O.D, F.P.D, BOE No, C.F.S */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium">P.O.D</label>
                    <input value={main.pod} onChange={(e)=>updateMain('pod', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">F.P.D</label>
                    <input value={main.fpd} onChange={(e)=>updateMain('fpd', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">BOE No</label>
                    <input value={main.boe_no} onChange={(e)=>updateMain('boe_no', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">C.F.S</label>
                    <select value={main.cfs} onChange={(e)=>updateMain('cfs', e.target.value)} className="w-full border rounded p-2">
                      <option value="">Select C.F.S.</option>
                      <option value="CFS A">CFS A</option>
                      <option value="CFS B">CFS B</option>
                    </select>
                  </div>
                </div>

                {/* Row 6: Item No, SUB No, IGM No, IGM Date */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Item No</label>
                    <input value={main.item_no} onChange={(e)=>updateMain('item_no', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">SUB No</label>
                    <input value={main.sub_no} onChange={(e)=>updateMain('sub_no', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">IGM No</label>
                    <input value={main.igm_no} onChange={(e)=>updateMain('igm_no', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">IGM Date</label>
                    <input type="date" value={main.igm_date} onChange={(e)=>updateMain('igm_date', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                </div>

                {/* Row 7: ETD Date, Reference No, Manifest Filling, CFS Filling */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium">ETD Date</label>
                    <input type="date" value={main.etd} onChange={(e)=>updateMain('etd', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Reference No</label>
                    <input value={main.reference_no} onChange={(e)=>updateMain('reference_no', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Manifest Filling</label>
                    <select value={main.manifest_filling} onChange={(e)=>updateMain('manifest_filling', e.target.value)} className="w-full border rounded p-2">
                      {manifestFillingOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">CFS Filling</label>
                    <select value={main.cfs_filling} onChange={(e)=>updateMain('cfs_filling', e.target.value)} className="w-full border rounded p-2">
                      {cfsFillingOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 8: ETA Date, Branch Code, Execution Branch, GST State From */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium">ETA Date</label>
                    <input type="date" value={main.eta} onChange={(e)=>updateMain('eta', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Branch Code</label>
                    <select value={main.branch_code} onChange={(e)=>updateMain('branch_code', e.target.value)} className="w-full border rounded p-2">
                      {branchOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Execution Branch</label>
                    <select value={main.execution_branch} onChange={(e)=>updateMain('execution_branch', e.target.value)} className="w-full border rounded p-2">
                      {branchOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">GST State From</label>
                    <select value={main.gst_state_from} onChange={(e)=>updateMain('gst_state_from', e.target.value)} className="w-full border rounded p-2">
                      {gstStateOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={()=>saveTab('Main')} disabled={saving}>{saving ? 'Saving...' : 'Save Main'}</button>
                </div>
              </div>
            )}

            {/* other tabs (Party/Packages/Inventory/Container/Description/BuyRates/SellRates/Vehicle) unchanged from previous version */}

            {activeTab === 'Party' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Consignee</label>
                    <input value={party.consignee} onChange={(e)=>updateParty('consignee', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Carrier</label>
                    <input value={party.carrier} onChange={(e)=>updateParty('carrier', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Line</label>
                    <input value={party.line} onChange={(e)=>updateParty('line', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Shipper</label>
                    <input value={party.shipper} onChange={(e)=>updateParty('shipper', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Notify</label>
                    <input value={party.notify} onChange={(e)=>updateParty('notify', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Agent</label>
                    <input value={party.agent} onChange={(e)=>updateParty('agent', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={()=>saveTab('Party')} disabled={saving}>{saving ? 'Saving...' : 'Save Party'}</button>
                </div>
              </div>
            )}

            {activeTab === 'Packages' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium">No. Of Packages</label>
                    <input value={packages.no_of_packages} onChange={(e)=>updatePackages('no_of_packages', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Package Type</label>
                    <input value={packages.package_type} onChange={(e)=>updatePackages('package_type', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">No. Of Pallets</label>
                    <input value={packages.no_of_pallets} onChange={(e)=>updatePackages('no_of_pallets', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Gross Weight</label>
                    <input value={packages.gross_weight} onChange={(e)=>updatePackages('gross_weight', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Net Weight</label>
                    <input value={packages.net_weight} onChange={(e)=>updatePackages('net_weight', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Volume</label>
                    <input value={packages.volume} onChange={(e)=>updatePackages('volume', e.target.value)} className="w-full border rounded p-2" />
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={()=>saveTab('Packages')} disabled={saving}>{saving ? 'Saving...' : 'Save Packages'}</button>
                </div>
              </div>
            )}

            {activeTab === 'Inventory' && (
              <div>
                <div className="mb-3"><button className="px-3 py-1 border rounded" onClick={addInventoryRow}>+ Add Row</button></div>
                <div className="space-y-3">
                  {inventory.items && inventory.items.length === 0 && <div className="text-sm text-slate-500">No inventory rows</div>}
                  {inventory.items && inventory.items.map((it, idx)=> (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-2 border rounded">
                      <div>
                        <label className="block text-sm">Container Type</label>
                        <select value={it.container_type} onChange={(e)=>updateInventoryAt(idx, 'container_type', e.target.value)} className="w-full border rounded p-2">
                          {containerSizeOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm">No. Of Units</label>
                        <input type="number" value={it.units} onChange={(e)=>updateInventoryAt(idx,'units',e.target.value)} className="w-full border rounded p-2" />
                      </div>
                      <div>
                        <label className="block text-sm">CSize</label>
                        <input value={it.csize} onChange={(e)=>updateInventoryAt(idx,'csize',e.target.value)} className="w-full border rounded p-2" />
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={()=>removeInventoryRow(idx)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={()=>saveTab('Inventory')} disabled={saving}>{saving ? 'Saving...' : 'Save Inventory'}</button>
                </div>
              </div>
            )}

            {activeTab === 'Container' && (
              <div>
                <div className="mb-3"><button className="px-3 py-1 border rounded" onClick={addContainer}>+ Add Container</button></div>
                <div className="space-y-3">
                  {containers.containers && containers.containers.length === 0 && <div className="text-sm text-slate-500">No containers</div>}
                  {containers.containers && containers.containers.map((c, idx)=> (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end p-2 border rounded">
                      <div>
                        <label className="block text-sm">Container No</label>
                        <input value={c.container_no} onChange={(e)=>updateContainerAt(idx,'container_no',e.target.value)} className="w-full border rounded p-2" />
                      </div>
                      <div>
                        <label className="block text-sm">Container Type</label>
                        <select value={c.container_type} onChange={(e)=>updateContainerAt(idx,'container_type',e.target.value)} className="w-full border rounded p-2">
                          {containerSizeOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm">Seal No</label>
                        <input value={c.seal_no} onChange={(e)=>updateContainerAt(idx,'seal_no',e.target.value)} className="w-full border rounded p-2" />
                      </div>
                      <div>
                        <label className="block text-sm">No. Of Packages</label>
                        <input type="number" value={c.no_of_packages} onChange={(e)=>updateContainerAt(idx,'no_of_packages',e.target.value)} className="w-full border rounded p-2" />
                      </div>
                      <div>
                        <label className="block text-sm">Package Type</label>
                        <input value={c.package_type} onChange={(e)=>updateContainerAt(idx,'package_type',e.target.value)} className="w-full border rounded p-2" />
                      </div>
                      <div className="flex gap-2">
                        <div>
                          <label className="block text-sm">Gross Weight</label>
                          <input value={c.gross_weight} onChange={(e)=>updateContainerAt(idx,'gross_weight',e.target.value)} className="w-full border rounded p-2" />
                        </div>
                        <div className="flex items-center">
                          <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={()=>removeContainerAt(idx)}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={()=>saveTab('Container')} disabled={saving}>{saving ? 'Saving...' : 'Save Container'}</button>
                </div>
              </div>
            )}

            {activeTab === 'Description' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm">Marks Nos</label>
                    <textarea value={description.marks_nos} onChange={(e)=>updateDescription('marks_nos', e.target.value)} className="w-full border rounded p-2" rows={4} />
                  </div>
                  <div>
                    <label className="block text-sm">Description</label>
                    <textarea value={description.description} onChange={(e)=>updateDescription('description', e.target.value)} className="w-full border rounded p-2" rows={4} />
                  </div>
                  <div>
                    <label className="block text-sm">Remarks</label>
                    <textarea value={description.remarks} onChange={(e)=>updateDescription('remarks', e.target.value)} className="w-full border rounded p-2" rows={4} />
                  </div>
                </div>

                <div className="mt-3">
                  <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={()=>saveTab('Description')} disabled={saving}>{saving ? 'Saving...' : 'Save Description'}</button>
                </div>
              </div>
            )}

            {activeTab === 'BuyRates' && (
              <div>
                <div className="mb-3"><button className="px-3 py-1 border rounded" onClick={()=>addRateRow('buy')}>+ Add Row</button></div>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="p-2 border">DR/CR</th>
                        <th className="p-2 border">Client</th>
                        <th className="p-2 border">Address</th>
                        <th className="p-2 border">Charge</th>
                        <th className="p-2 border">GST</th>
                        <th className="p-2 border">Unit</th>
                        <th className="p-2 border">Quantity</th>
                        <th className="p-2 border">Rate</th>
                        <th className="p-2 border">Cur</th>
                        <th className="p-2 border">Ex Rate</th>
                        <th className="p-2 border">Amount</th>
                        <th className="p-2 border">AMT_FC</th>
                        <th className="p-2 border">Narration</th>
                        <th className="p-2 border">Group</th>
                        <th className="p-2 border">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(buyRates.rows||[]).map((r, idx)=> (
                        <tr key={idx} className="border-b">
                          <td className="p-2"><input value={r.drcr} onChange={(e)=>updateRateAt('buy',idx,'drcr',e.target.value)} className="border p-1 rounded w-20"/></td>
                          <td className="p-2"><input value={r.client} onChange={(e)=>updateRateAt('buy',idx,'client',e.target.value)} className="border p-1 rounded"/></td>
                          <td className="p-2"><input value={r.address} onChange={(e)=>updateRateAt('buy',idx,'address',e.target.value)} className="border p-1 rounded"/></td>
                          <td className="p-2"><input value={r.charge} onChange={(e)=>updateRateAt('buy',idx,'charge',e.target.value)} className="border p-1 rounded"/></td>
                          <td className="p-2"><input value={r.gst} onChange={(e)=>updateRateAt('buy',idx,'gst',e.target.value)} className="border p-1 rounded w-24"/></td>
                          <td className="p-2"><input value={r.unit} onChange={(e)=>updateRateAt('buy',idx,'unit',e.target.value)} className="border p-1 rounded w-20"/></td>
                          <td className="p-2"><input type="number" value={r.quantity} onChange={(e)=>updateRateAt('buy',idx,'quantity',e.target.value)} className="border p-1 rounded w-20"/></td>
                          <td className="p-2"><input type="number" value={r.rate} onChange={(e)=>updateRateAt('buy',idx,'rate',e.target.value)} className="border p-1 rounded w-24"/></td>
                          <td className="p-2"><input value={r.currency} onChange={(e)=>updateRateAt('buy',idx,'currency',e.target.value)} className="border p-1 rounded w-20"/></td>
                          <td className="p-2"><input type="number" value={r.ex_rate} onChange={(e)=>updateRateAt('buy',idx,'ex_rate',e.target.value)} className="border p-1 rounded w-24"/></td>
                          <td className="p-2">{Number(r.amount||0).toFixed(2)}</td>
                          <td className="p-2">{Number(r.amt_fc||0).toFixed(2)}</td>
                          <td className="p-2"><input value={r.narration} onChange={(e)=>updateRateAt('buy',idx,'narration',e.target.value)} className="border p-1 rounded"/></td>
                          <td className="p-2"><input value={r.group} onChange={(e)=>updateRateAt('buy',idx,'group',e.target.value)} className="border p-1 rounded w-20"/></td>
                          <td className="p-2"><button className="px-2 py-1 bg-red-500 text-white rounded" onClick={()=>removeRateRow('buy',idx)}>Remove</button></td>
                        </tr>
                      ))}

                      <tr>
                        <td colSpan={10} className="p-2 text-right font-semibold">Total :</td>
                        <td className="p-2 font-semibold">{totalAmount('buy')}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-3">
                  <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={()=>saveTab('BuyRates')} disabled={saving}>{saving ? 'Saving...' : 'Save Buy Rates'}</button>
                </div>
              </div>
            )}

            {activeTab === 'SellRates' && (
              <div>
                <div className="mb-3"><button className="px-3 py-1 border rounded" onClick={()=>addRateRow('sell')}>+ Add Row</button></div>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="p-2 border">DR/CR</th>
                        <th className="p-2 border">Client</th>
                        <th className="p-2 border">Address</th>
                        <th className="p-2 border">Charge</th>
                        <th className="p-2 border">GST</th>
                        <th className="p-2 border">Unit</th>
                        <th className="p-2 border">Quantity</th>
                        <th className="p-2 border">Rate</th>
                        <th className="p-2 border">Cur</th>
                        <th className="p-2 border">Ex Rate</th>
                        <th className="p-2 border">Amount</th>
                        <th className="p-2 border">AMT_FC</th>
                        <th className="p-2 border">Narration</th>
                        <th className="p-2 border">Group</th>
                        <th className="p-2 border">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sellRates.rows||[]).map((r, idx)=> (
                        <tr key={idx} className="border-b">
                          <td className="p-2"><input value={r.drcr} onChange={(e)=>updateRateAt('sell',idx,'drcr',e.target.value)} className="border p-1 rounded w-20"/></td>
                          <td className="p-2"><input value={r.client} onChange={(e)=>updateRateAt('sell',idx,'client',e.target.value)} className="border p-1 rounded"/></td>
                          <td className="p-2"><input value={r.address} onChange={(e)=>updateRateAt('sell',idx,'address',e.target.value)} className="border p-1 rounded"/></td>
                          <td className="p-2"><input value={r.charge} onChange={(e)=>updateRateAt('sell',idx,'charge',e.target.value)} className="border p-1 rounded"/></td>
                          <td className="p-2"><input value={r.gst} onChange={(e)=>updateRateAt('sell',idx,'gst',e.target.value)} className="border p-1 rounded w-24"/></td>
                          <td className="p-2"><input value={r.unit} onChange={(e)=>updateRateAt('sell',idx,'unit',e.target.value)} className="border p-1 rounded w-20"/></td>
                          <td className="p-2"><input type="number" value={r.quantity} onChange={(e)=>updateRateAt('sell',idx,'quantity',e.target.value)} className="border p-1 rounded w-20"/></td>
                          <td className="p-2"><input type="number" value={r.rate} onChange={(e)=>updateRateAt('sell',idx,'rate',e.target.value)} className="border p-1 rounded w-24"/></td>
                          <td className="p-2"><input value={r.currency} onChange={(e)=>updateRateAt('sell',idx,'currency',e.target.value)} className="border p-1 rounded w-20"/></td>
                          <td className="p-2"><input type="number" value={r.ex_rate} onChange={(e)=>updateRateAt('sell',idx,'ex_rate',e.target.value)} className="border p-1 rounded w-24"/></td>
                          <td className="p-2">{Number(r.amount||0).toFixed(2)}</td>
                          <td className="p-2">{Number(r.amt_fc||0).toFixed(2)}</td>
                          <td className="p-2"><input value={r.narration} onChange={(e)=>updateRateAt('sell',idx,'narration',e.target.value)} className="border p-1 rounded"/></td>
                          <td className="p-2"><input value={r.group} onChange={(e)=>updateRateAt('sell',idx,'group',e.target.value)} className="border p-1 rounded w-20"/></td>
                          <td className="p-2"><button className="px-2 py-1 bg-red-500 text-white rounded" onClick={()=>removeRateRow('sell',idx)}>Remove</button></td>
                        </tr>
                      ))}

                      <tr>
                        <td colSpan={10} className="p-2 text-right font-semibold">Total :</td>
                        <td className="p-2 font-semibold">{totalAmount('sell')}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-3">
                  <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={()=>saveTab('SellRates')} disabled={saving}>{saving ? 'Saving...' : 'Save Sell Rates'}</button>
                </div>
              </div>
            )}

            {activeTab === 'Vehicle' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm">Vehicle No</label>
                    <input value={vehicle.vehicle_no} onChange={(e)=>updateVehicle('vehicle_no',e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm">Driver Name</label>
                    <input value={vehicle.driver_name} onChange={(e)=>updateVehicle('driver_name',e.target.value)} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm">Transport Company</label>
                    <input value={vehicle.transport_company} onChange={(e)=>updateVehicle('transport_company',e.target.value)} className="w-full border rounded p-2" />
                  </div>
                </div>

                <div className="mt-3">
                  <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={()=>saveTab('Vehicle')} disabled={saving}>{saving ? 'Saving...' : 'Save Vehicle'}</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>

      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
}
