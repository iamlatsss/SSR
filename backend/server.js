import express from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser';
import './config.js';

import Auth, { authenticateJWT, requireAdmin } from './AuthAPI/Auth.js';
import ForgotPasswordAPI from './AuthAPI/ForgotPasswordAPI.js';
import Admin from './Admin/admin.js';
import Booking from './Booking/Booking.js';
import Mail from './Mail/Mail.js';
import KYC from './KYC/KYC.js';
import Ports from './Data/Ports.js';
import Invoice from './Invoice/Invoice.js';
import ProformaInvoice from './Invoice/ProformaInvoice.js';
import Quotation from './Quotation/Quotation.js';
import S3Routes from './S3/S3Routes.js';
import MasterBL from './MasterBL/MasterBL.js';
import HouseBL from './HouseBL/HouseBL.js';

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
app.use('/admin', authenticateJWT, requireAdmin, Admin);
app.use('/booking', authenticateJWT, requireAdmin, Booking);
app.use('/masterbl', authenticateJWT, requireAdmin, MasterBL);
app.use('/housebl', authenticateJWT, requireAdmin, HouseBL);
app.use('/mail', Mail);
app.use('/kyc', authenticateJWT, requireAdmin, KYC);
app.use('/ports', Ports);
app.use('/invoice', authenticateJWT, requireAdmin, Invoice);
app.use('/proforma', authenticateJWT, requireAdmin, ProformaInvoice);
app.use('/quotation', Quotation);
app.use('/s3', authenticateJWT, requireAdmin, S3Routes);

app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});

