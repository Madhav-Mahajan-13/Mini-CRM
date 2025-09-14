import express from 'express';
import dotenv from 'dotenv';
import db from './dbConnection.js';
import router from './routes/userRoutes.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
// const sampleRoutes = require('./routes/sampleRoutes');
// app.use('/api', sampleRoutes);

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Mini-crm Server Status</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f9f9f9; color: #222; text-align: center; margin-top: 10vh; }
          .status { display: inline-block; padding: 2rem 3rem; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px #0001; }
          h1 { color: #007bff; }
        </style>
      </head>
      <body>
        <div class="status">
          <h1>🚀 Mini-crm Server is Active!</h1>
          <p>Environment: <b>${process.env.NODE_ENV || 'development'}</b></p>
          <p>Time: ${new Date().toLocaleString()}</p>
        </div>
      </body>
    </html>
  `);
});

app.use('/api/users', router);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
