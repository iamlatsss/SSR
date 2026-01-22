import express from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser';
import './config.js';

import Auth from './AuthAPI/Auth.js';
import Admin from './Admin/admin.js';
import Booking from './Booking/Booking.js';
import Mail from './Mail/Mail.js';
import KYC from './KYC/KYC.js';
import Ports from './Data/Ports.js';
import Invoice from './Invoice/Invoice.js';

const app = express();
const PORT = 5001;
const public_ip = process.env.URI;

const allowedOrigins = [
  'http://127.0.0.1:5173',
  `http://${public_ip}:5173`,
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  // 'https://my-frontend-domain.com'
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
app.use('/admin', Admin);
app.use('/booking', Booking);
app.use('/mail', Mail);
app.use('/kyc', KYC);
app.use('/ports', Ports);
app.use('/invoice', Invoice);


app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});

