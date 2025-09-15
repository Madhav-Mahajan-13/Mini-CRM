import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import pool from "./dbConnection.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      const name = profile.displayName;
      
      

      try {
        // Check if user exists in users table
        const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        let user;

        if (existing.rows.length === 0) {
          // Create new user with just name and email (matching your schema)
          const newUser = await pool.query(
            "INSERT INTO users (name, email, created_at) VALUES ($1, $2, NOW()) RETURNING *",
            [name, email]
          );
          user = newUser.rows[0];
        } else {
          user = existing.rows[0];
        }

        return done(null, user);
      } catch (err) {
        console.error("Database error in Google Strategy:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, user.rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});