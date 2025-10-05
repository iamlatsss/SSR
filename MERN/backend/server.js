import express from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser';
import './config.js';

import Auth from './AuthAPI/Auth.js';
import Admin from './Admin/admin.js';
import Booking from './Booking/Booking.js';
import Mail from './Mail/Mail.js';

const app = express();
const PORT = 5001;
const public_ip = process.env.URI;

const allowedOrigins = [
  'http://localhost:5173',
  `http://${public_ip}:5173`,
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
app.use('/api/auth', Auth);
app.use('/api/admin', Admin);
app.use('/api/booking', Booking);
app.use('/api/mail', Mail);


app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend server listening on http://127.0.0.1:${PORT}`);
}); 

