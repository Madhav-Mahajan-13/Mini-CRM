import "dotenv/config";
import express from "express";
import passport from "passport";
import cors from "cors";
import jwt from "jsonwebtoken";
import session from "express-session";
import "./auth.js";
import router from './routes/userRoutes.js';
import { authenticateUser } from './middleware/authMiddleware.js'; // Add this

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware (development only)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.user) {
      console.log(`User: ${req.user.name} (${req.user.email})`);
    }
    next();
  });
}

// Google OAuth routes
app.get("/auth/google",
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    prompt: "select_account"
  })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: req.user.id,
          email: req.user.email,
          name: req.user.name 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: "7d" }
      );
      
      // Prepare user data (only include fields that exist in your schema)
      const userData = {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        created_at: req.user.created_at
      };
      
      const user = encodeURIComponent(JSON.stringify(userData));
      
      // Redirect to frontend with token and user data
      res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}&user=${user}`);
    } catch (error) {
      console.error("Error in Google callback:", error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

// Enhanced logout route
app.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: "Logout failed" 
      });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: "Session destruction failed" 
        });
      }
      res.clearCookie("connect.sid");
      res.status(200).json({ 
        success: true, 
        message: "Logged out successfully" 
      });
    });
  });
});

// Test auth endpoint
app.get("/auth/me", authenticateUser, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Routes
// app.use('/api/users', router);
app.use('/api/users', authenticateUser, router); // Protected campaign routes

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Mini CRM Server Status</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f9f9f9; color: #222; text-align: center; margin-top: 10vh; }
          .status { display: inline-block; padding: 2rem 3rem; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px #0001; }
          h1 { color: #007bff; }
        </style>
      </head>
      <body>
        <div class="status">
          <h1>🚀 Mini CRM Server is Active!</h1>
          <p>Environment: <b>${process.env.NODE_ENV || 'development'}</b></p>
          <p>Time: ${new Date().toLocaleString()}</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`Backend URL: ${process.env.BACKEND_URL}`);
});
