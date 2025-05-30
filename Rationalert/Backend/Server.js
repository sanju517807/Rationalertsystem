// backend/server.js
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

// Import your auth routes as a function that accepts the pool
const authRoutes = require('./routes/auth'); // <--- NO CHANGE HERE, just importing the function

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection pool (THIS IS THE ONE AND ONLY POOL CREATED)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to MySQL database!');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to MySQL database:', err.message);
    process.exit(1);
  });

app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cors());         // Enable CORS for all routes

// Root route (for testing)
app.get('/', (req, res) => {
  res.send('Ration Alert System Backend is Running and Connected to DB!');
});

// USE AUTH ROUTES: Pass the pool to the authRoutes function
app.use('/api/auth', authRoutes(pool)); // <--- CHANGE THIS LINE: Call authRoutes with the pool

// Start the server only if DB connection is successful
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});