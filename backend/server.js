import express from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser';
import './config.js';

// reload nodemon
import Auth, { authenticateJWT, requireAdmin, checkPermission } from './AuthAPI/Auth.js';
import ForgotPasswordAPI from './AuthAPI/ForgotPasswordAPI.js';
import Admin from './Admin/admin.js';
import Booking from './Booking/Booking.js';
import BookingUpdates from './Booking/BookingUpdates.js';
import UserBookingUpdates from './Booking/UserBookingUpdates.js';
import Mail from './Mail/Mail.js';
import KYC from './KYC/KYC.js';
import Ports from './Data/Ports.js';
import Invoice from './Invoice/Invoice.js';
import ProformaInvoice from './Invoice/ProformaInvoice.js';
import EInvoice from './Invoice/EInvoice.js';
import Quotation from './Quotation/Quotation.js';
import S3Routes from './S3/S3Routes.js';
import MasterBL from './MasterBL/MasterBL.js';
import EditRequests from './MasterBL/EditRequests.js';
import Party from './Party/Party.js';
import PackageTypes from './Data/PackageTypes.js';
import CFS from './CFS/CFS.js';
import { startBackupScheduler } from './database-maintenance/scheduler.js';

const app = express();
const PORT = 5001;
const public_ip = process.env.URI;
const frontend_url = process.env.FRONTEND_URL;

const allowedOrigins = [
  'http://127.0.0.1:5173',
  `http://${public_ip}:5173`,
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  frontend_url,
];

app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use('/auth', Auth);
app.use('/forgot-password', ForgotPasswordAPI);
app.use('/admin', authenticateJWT, checkPermission('canManageUsers'), Admin);
app.use('/booking', authenticateJWT, Booking);
app.use('/booking-updates', authenticateJWT, BookingUpdates);
app.use('/user-booking-updates', authenticateJWT, UserBookingUpdates);
app.use('/masterbl', authenticateJWT, MasterBL);
app.use('/masterbl/edit-requests', authenticateJWT, EditRequests);
app.use('/mail', Mail);
app.use('/kyc', authenticateJWT, checkPermission('canAccessKYC'), KYC);
app.use('/ports', Ports);
app.use('/invoice', authenticateJWT, Invoice);
app.use('/proforma', authenticateJWT, ProformaInvoice);
app.use('/einvoice', authenticateJWT, EInvoice);
app.use('/quotation', Quotation);
app.use('/s3', authenticateJWT, S3Routes);
app.use('/party', authenticateJWT, Party);
app.use('/package-types', PackageTypes);
app.use('/cfs', authenticateJWT, CFS);

app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
  startBackupScheduler('30 14 * * *'); // Triggers daily at 8:00 PM IST (14:30 UTC)
});

