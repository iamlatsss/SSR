import express from 'express';
import cors from 'cors'
import './config.js';
import cookieParser from 'cookie-parser';

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

app.use(express.json())
  

app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server listening on http://0.0.0.0:${PORT}`);
}); 

