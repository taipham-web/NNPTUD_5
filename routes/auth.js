var express = require("express");
var router = express.Router();
var jwt = require("jsonwebtoken");
var userService = require("../utils/userService");
var fs = require("fs");
var path = require("path");
var bcrypt = require("bcrypt");

const JWT_SECRET = "your_jwt_secret_key_here";
const JWT_EXPIRES_IN = "24h";
const DATA_PATH = path.join(__dirname, "../data/users.json");

/**
 * Read users from file (including password for authentication)
 */
function readUsers() {
  const data = fs.readFileSync(DATA_PATH, "utf8");
  return JSON.parse(data);
}

/**
 * POST /register
 * Register a new user
 * Body: { username, password, email, fullName, avatarUrl }
 */
router.post("/register", async function (req, res, next) {
  try {
    const { username, password, email, fullName, avatarUrl } = req.body;

    // Validation
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and email are required",
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Use userService to create the user (default roleId = null, status = false)
    const result = await userService.createUser({
      username,
      password,
      email,
      fullName: fullName || "",
      avatarUrl: avatarUrl || "https://i.sstatic.net/l60Hf.png",
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    // Generate JWT token for the newly registered user
    const token = jwt.sign(
      {
        id: result.data.id,
        username: result.data.username,
        email: result.data.email,
        roleId: result.data.roleId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: result.data,
        token: token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * POST /login
 * Login with username/email and password
 * Body: { username, password } or { email, password }
 */
router.post("/login", async function (req, res, next) {
  try {
    const { username, email, password } = req.body;

    // Validation
    if ((!username && !email) || !password) {
      return res.status(400).json({
        success: false,
        message: "Username or email, and password are required",
      });
    }

    // Find user by username or email (read directly to get password)
    const users = readUsers();
    const user = users.find(
      (u) =>
        (u.username === username || u.email === email) && !u.deleted
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user account is active
    if (!user.status) {
      return res.status(403).json({
        success: false,
        message: "Account is not activated. Please contact an administrator.",
      });
    }

    // Compare password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update loginCount
    const userIndex = users.findIndex((u) => u.id === user.id);
    users[userIndex].loginCount = (users[userIndex].loginCount || 0) + 1;
    users[userIndex].updatedAt = new Date().toISOString();
    fs.writeFileSync(DATA_PATH, JSON.stringify(users, null, 2), "utf8");

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.roleId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          ...userWithoutPassword,
          loginCount: users[userIndex].loginCount,
        },
        token: token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

module.exports = router;
