// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
const PORT = process.env.PORT || 5000;

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('ZAPSHIFT Parcel Delivery Server is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
