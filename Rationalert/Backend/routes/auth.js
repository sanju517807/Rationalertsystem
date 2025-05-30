// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For generating tokens
// const mysql = require('mysql2/promise'); // <--- REMOVE THIS LINE (No longer needed here)

// Load environment variables (make sure this is consistent with server.js)
require('dotenv').config();

// // REMOVE THIS ENTIRE BLOCK - The pool will be passed from server.js
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_DATABASE,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

const jwtSecret = process.env.JWT_SECRET || 'your_default_super_secret_jwt_key';

// This function will be called by server.js to initialize the routes with the pool
module.exports = (pool) => { // <--- CHANGE THIS LINE: Export a function that accepts pool
  // @route   POST /api/auth/register
  // @desc    Register a new user
  // @access  Public
  router.post('/register', async (req, res) => {
    const { username, email, phone, password, ration_card_id, role } = req.body;

    // Basic validation (you should add more robust validation)
    if (!username || !email || !phone || !password || !ration_card_id || !role) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
      const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);

      if (existingUser.length > 0) {
        return res.status(400).json({ msg: 'User with that email or username already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insert new user into database
      const [result] = await pool.query(
        'INSERT INTO users (username, email, phone, password_hash, ration_card_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [username, email, phone, hashedPassword, ration_card_id, role]
      );

      // Get the ID of the newly created user
      const userId = result.insertId;

      // Create and sign JWT
      const payload = {
        user: {
          id: userId,
          role: role
        }
      };

      jwt.sign(
        payload,
        jwtSecret,
        { expiresIn: '1h' }, // Token expires in 1 hour
        (err, token) => {
          if (err) throw err;
          res.status(201).json({ msg: 'User registered successfully', token });
        }
      );

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

  router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
      // Check if user exists by username or email
      const [users] = await pool.query(
        'SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?',
        [identifier, identifier, identifier]
      );

      if (users.length === 0) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      const user = users[0];

      // Compare given password with hashed password in DB
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // User matched, create and sign JWT
      const payload = {
        user: {
          id: user.user_id, // Ensure this matches your DB column name for the primary key
          role: user.role
        }
      };

      jwt.sign(
        payload,
        jwtSecret,
        { expiresIn: '1h' }, // Token expires in 1 hour
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

  return router; // <--- CHANGE THIS LINE: Return the configured router
}; // <--- ADD THIS CLOSING BRACE for the exported function