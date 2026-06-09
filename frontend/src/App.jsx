import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './context/protection';
import PublicRoute from './context/publicRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Admin from './pages/Admin';
import Quotation from './pages/Quotation';
import BookingList from './pages/BookingList';
import BookingForm from './pages/Bookings';
import IGM from './pages/IGM';
import KYCList from './pages/KYCList';
import DOFC from './pages/DOFC.jsx'; // Combined DO/FC
import Invoice from './pages/Invoice.jsx';
import InvoiceGenerator from './pages/InvoiceGenerator.jsx';
import Profile from './pages/Profile.jsx';
import { SIMasterBLList, SIMasterBLForm } from './pages/SIMasterBL';
import { SIHouseBLList, SIHouseBLForm } from './pages/SIHouseBL';
import ProformaInvoice from './pages/ProformaInvoice';
import Placeholder from './pages/Placeholder';
import Charges from './pages/Charges';
import Parties from './pages/Parties';
import EInvoiceApproval from './pages/EInvoiceApproval';
import EInvoicePosting from './pages/EInvoicePosting';
import HBLConfirmation from './pages/HBLConfirmation';
import HBLFinal from './pages/HBLFinal';
import HBLTelexRelease from './pages/HBLTelexRelease';

// Placeholder for now
const Settings = () => (
  <DashboardLayout title="Settings">
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <p className="text-slate-600 dark:text-slate-400">Settings go here.</p>
    </div>
  </DashboardLayout>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/quotation" element={<Quotation />} />

            {/* Restricted to Admin */}
            <Route element={<ProtectedRoute allowedRoles={['Admin', 'admin']} />}>
              <Route path="/bookings" element={<BookingList />} />
              <Route path="/booking-form" element={<BookingForm />} />
              <Route path="/si-masterbl" element={<SIMasterBLList />} />
              <Route path="/si-masterbl-form" element={<SIMasterBLForm />} />
              <Route path="/si-housebl" element={<SIHouseBLList />} />
              <Route path="/si-housebl-form" element={<SIHouseBLForm />} />
              <Route path="/igm" element={<IGM />} />
              <Route path="/kyc" element={<KYCList />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/do-fc" element={<DOFC />} />
              <Route path="/invoice" element={<Invoice />} />
              <Route path="/invoice/edit/:jobNo" element={<InvoiceGenerator />} />
              <Route path="/proforma-invoice" element={<ProformaInvoice />} />
              <Route path="/users" element={<Admin />} />
              <Route path="/charges" element={<Charges />} />
              <Route path="/parties" element={<Parties />} />
              <Route path="/e-invoice-approval" element={<EInvoiceApproval />} />
              <Route path="/e-invoice-posting" element={<EInvoicePosting />} />
              <Route path="/hbl-confirmation" element={<HBLConfirmation />} />
              <Route path="/hbl-final" element={<HBLFinal />} />
              <Route path="/hbl-telex-release" element={<HBLTelexRelease />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
