import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../NavBar/navbar';

const PlaceholderNavbar = () => (
  <div className="w-full bg-slate-800 text-white p-4">
    <div className="max-w-7xl mx-auto">Navbar (not loaded) — check components/NavBar/navbar.jsx path</div>
  </div>
);

export default function KYCPage() {
  const [NavbarComp, setNavbarComp] = useState(() => PlaceholderNavbar);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: 'All', city: '', gstin: '' });

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: '',
    bankName: '',
    accountNo: '',
    ifsc: '',
    remarks: '',
    status: 'Active',
    date: '',
    branch: '',
    year_of_establishment: '',
    director: '',
    aadhar: '',
    branch_office: '',
    office_address: '',
  };

  const [form, setForm] = useState(emptyForm);
  const toastContainerRef = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    // Try to dynamic-import the Navbar you referenced. If it fails, we keep the placeholder.
    import('../NavBar/navbar')
      .then((m) => {
        if (m && m.default) setNavbarComp(() => m.default);
        else if (m) {
          setNavbarComp(() => (m.Navbar || m.Nav || PlaceholderNavbar));
        }
      })
      .catch((err) => {
        console.warn('Failed to load ../NavBar/navbar — check path & filename (case-sensitive).', err);
        setNavbarComp(() => PlaceholderNavbar);
      });
  }, []);

  useEffect(() => {
    // load initial sample data
    setLoading(true);
    const sample = [
      { id: 1, name: 'GRAPHITE INDIA LIMITED', city: 'Nashik', gstin: '27AAAAA0000A1Z5', status: 'Active', phone: '9876543210' },
      { id: 2, name: 'A.G.E. CORPORATION', city: 'Mumbai', gstin: '27BBBBB1111B2Z6', status: 'Inactive', phone: '9123456780' },
    ];
    const t = setTimeout(() => { setVendors(sample); setLoading(false); }, 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      applyFilters();
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]); // eslint-disable-line

  function applyFilters() {
    setLoading(true);
    setTimeout(() => {
      const s = search.trim().toLowerCase();
      let list = [
        { id: 1, name: 'GRAPHITE INDIA LIMITED', city: 'Nashik', gstin: '27AAAAA0000A1Z5', status: 'Active', phone: '9876543210' },
        { id: 2, name: 'A.G.E. CORPORATION', city: 'Mumbai', gstin: '27BBBBB1111B2Z6', status: 'Inactive', phone: '9123456780' },
        { id: 3, name: 'GLOBAL TRADE LLC', city: 'Pune', gstin: '27CCCCC2222C3Z7', status: 'Active', phone: '9988776655' },
      ];
      if (s) list = list.filter(v => v.name.toLowerCase().includes(s) || (v.gstin || '').toLowerCase().includes(s) || (v.phone || '').includes(s));
      if (filters.status !== 'All') list = list.filter(v => v.status === filters.status);
      if (filters.city) list = list.filter(v => v.city.toLowerCase().includes(filters.city.toLowerCase()));
      if (filters.gstin) list = list.filter(v => (v.gstin || '').toLowerCase().includes(filters.gstin.toLowerCase()));
      setVendors(list);
      setLoading(false);
    }, 200);
  }

  function resetFilters() {
    setFilters({ status: 'All', city: '', gstin: '' });
    setSearch('');
    applyFilters();
  }

  function openAddModal() {
    setForm(emptyForm);
    setShowModal(true);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const newId = Math.max(0, ...vendors.map(v => v.id)) + 1;
      setVendors(prev => [{ id: newId, name: form.name, city: form.city, gstin: form.gstin, status: form.status, phone: form.phone }, ...prev]);
      setShowModal(false);
      smallToast('Customer added');
    } catch (err) {
      console.error(err);
      smallToast('Save failed', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this vendor? This action cannot be undone.')) return;
    setVendors(prev => prev.filter(v => v.id !== id));
    smallToast('Vendor deleted');
  }

  function handleEdit(v) {
    setForm({
      name: v.name || '',
      contactPerson: v.contactPerson || '',
      email: v.email || '',
      phone: v.phone || '',
      address: v.address || '',
      city: v.city || '',
      state: v.state || '',
      pincode: v.pincode || '',
      gstin: v.gstin || '',
      pan: v.pan || '',
      bankName: v.bankName || '',
      accountNo: v.accountNo || '',
      ifsc: v.ifsc || '',
      remarks: v.remarks || '',
      status: v.status || 'Active',
      date: v.date || '',
      branch: v.branch || '',
      year_of_establishment: v.year_of_establishment || '',
      director: v.director || '',
      aadhar: v.aadhar || '',
      branch_office: v.branch_office || '',
      office_address: v.office_address || '',
    });
    setShowModal(true);
  }

  function smallToast(msg, type = 'success') {
    const container = toastContainerRef.current || createToastContainer();
    const t = document.createElement('div');
    t.innerText = msg;
    t.className = `mb-2 px-4 py-2 rounded shadow ${type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`;
    container.appendChild(t);
    setTimeout(() => {
      t.classList.add('opacity-0');
      setTimeout(() => t.remove(), 300);
    }, 1500);
  }

  function createToastContainer() {
    const c = document.createElement('div');
    c.style.position = 'fixed';
    c.style.right = '16px';
    c.style.top = '16px';
    c.style.zIndex = 9999;
    document.body.appendChild(c);
    toastContainerRef.current = c;
    return c;
  }

  const NavbarRender = NavbarComp; // component to render (Placeholder or loaded)

  return (
    <div className="min-h-screen p-20">
        <Navbar />
        <div className="max-w-5xl mx-auto mt-8 p-10 bg-white rounded-3xl shadow-2xl text-black">
          <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">
            Job Bookings
          </h3>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">Customer List</h2>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name / GSTIN / phone..."
                aria-label="Search vendors"
                className="px-3 py-2 rounded-full bg-gray-100 placeholder-slate-500 text-slate-800 w-64 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            <button onClick={() => setShowFilters(s => !s)} className="px-3 py-2 bg-slate-800 text-white rounded-md">Filter</button>

            <button onClick={openAddModal} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full">Add Customer +</button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="w-full mt-1 p-2 border rounded">
                  <option>All</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">City</label>
                <input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} className="w-full mt-1 p-2 border rounded" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">GSTIN</label>
                <input value={filters.gstin} onChange={e => setFilters(f => ({ ...f, gstin: e.target.value }))} className="w-full mt-1 p-2 border rounded" />
              </div>
              <div className="flex items-end gap-2">
                <button onClick={applyFilters} className="px-4 py-2 bg-sky-600 text-white rounded">Apply</button>
                <button onClick={resetFilters} className="px-4 py-2 bg-gray-200 rounded">Reset</button>
              </div>
            </div>
          </div>
        )}

        {/* Vendor list */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">City</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">GSTIN</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-sm text-slate-500">No vendors found</td>
                  </tr>
                )}
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{v.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{v.city}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{v.gstin}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{v.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${v.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                      <button onClick={() => handleEdit(v)} className="px-3 py-1 bg-yellow-500 text-white rounded-md">Edit</button>
                      <button onClick={() => handleDelete(v.id)} className="px-3 py-1 bg-red-500 text-white rounded-md">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal (Add / Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">KYC Form</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-600 hover:text-gray-900 text-xl">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input name="date" value={form.date} onChange={handleFormChange} type="date" className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <input name="branch" value={form.branch} onChange={handleFormChange} className="w-full p-2 border rounded" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name of the Customer</label>
                <input name="name" value={form.name} onChange={handleFormChange} required className="w-full p-3 border rounded-xl" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address with State, Pin Code, Phone, Website</label>
                <textarea name="address" value={form.address} onChange={handleFormChange} rows={3} className="w-full p-3 border rounded-xl" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type of Customer</label>
                  <input name="contactPerson" value={form.contactPerson} onChange={handleFormChange} className="w-full p-2 border rounded" placeholder="Type / Category" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={form.status} onChange={handleFormChange} className="w-full p-2 border rounded">
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year of Establishment</label>
                  <input name="year_of_establishment" value={form.year_of_establishment} onChange={handleFormChange} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                  <input name="pan" value={form.pan} onChange={handleFormChange} className="w-full p-2 border rounded" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name of Director/Partner with address and email</label>
                <textarea name="director" value={form.director} onChange={handleFormChange} rows={2} className="w-full p-3 border rounded-xl" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Card No. (For Sole Proprietor)</label>
                  <input name="aadhar" value={form.aadhar} onChange={handleFormChange} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Offices & Address</label>
                  <input name="branch_office" value={form.branch_office} onChange={handleFormChange} className="w-full p-2 border rounded" />
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-gray-700 mb-2">GST Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office/Billing Address</label>
                    <textarea name="office_address" value={form.office_address} onChange={handleFormChange} rows={2} className="w-full p-3 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input name="state" value={form.state} onChange={handleFormChange} className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                    <input name="gstin" value={form.gstin} onChange={handleFormChange} className="w-full p-2 border rounded" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea name="remarks" value={form.remarks} onChange={handleFormChange} rows={2} className="w-full p-3 border rounded-xl" />
              </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <button type="submit" disabled={submitting} className="px-10 py-3 bg-blue-600 text-white rounded-xl hover:scale-[1.02] transform transition">
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 bg-blue-200 rounded-xl">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
