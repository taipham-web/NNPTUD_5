var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");

// Helper function to read users from file
function readUsers() {
  const dataPath = path.join(__dirname, "../data/users.json");
  const data = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(data);
}

// Helper function to write users to file
function writeUsers(users) {
  const dataPath = path.join(__dirname, "../data/users.json");
  fs.writeFileSync(dataPath, JSON.stringify(users, null, 2), "utf8");
}

// Helper function to read roles from file
function readRoles() {
  const dataPath = path.join(__dirname, "../data/roles.json");
  const data = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(data);
}

/**
 * GET /api/v1/users
 * Get all users (excluding soft-deleted)
 * Query params: username, email, status (optional filters)
 */
router.get("/", function (req, res, next) {
  try {
    let users = readUsers();

    // Filter out soft-deleted users
    users = users.filter((user) => !user.deleted);

    // Filter by username if query parameter is provided
    const usernameFilter = req.query.username;
    if (usernameFilter) {
      users = users.filter((user) =>
        user.username.toLowerCase().includes(usernameFilter.toLowerCase()),
      );
    }

    // Filter by email if query parameter is provided
    const emailFilter = req.query.email;
    if (emailFilter) {
      users = users.filter((user) =>
        user.email.toLowerCase().includes(emailFilter.toLowerCase()),
      );
    }

    // Filter by status if query parameter is provided
    const statusFilter = req.query.status;
    if (statusFilter !== undefined) {
      const status = statusFilter === "true";
      users = users.filter((user) => user.status === status);
    }

    // Remove password from response
    users = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: "Error reading users",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/users/:id
 * Get user by ID
 */
router.get("/:id", function (req, res, next) {
  try {
    const users = readUsers();
    const userId = parseInt(req.params.id);

    const user = users.find((u) => u.id === userId && !u.deleted);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({
      message: "Error reading user",
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/users
 * Create a new user
 * Body: { username, password, email, fullName, avatarUrl, roleId }
 */
router.post("/", function (req, res, next) {
  try {
    const users = readUsers();
    const roles = readRoles();
    const {
      username,
      password,
      email,
      fullName = "",
      avatarUrl = "https://i.sstatic.net/l60Hf.png",
      roleId,
    } = req.body;

    // Validation
    if (!username || !password || !email) {
      return res.status(400).json({
        message: "Username, password, and email are required",
      });
    }

    // Check if username already exists
    const existingUsername = users.find(
      (u) => u.username === username && !u.deleted,
    );
    if (existingUsername) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    // Check if email already exists
    const existingEmail = users.find((u) => u.email === email && !u.deleted);
    if (existingEmail) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    // Validate roleId if provided
    if (roleId) {
      const role = roles.find((r) => r.id === roleId && !r.deleted);
      if (!role) {
        return res.status(400).json({
          message: "Invalid role ID",
        });
      }
    }

    // Generate new ID (max ID + 1)
    const maxId = users.reduce((max, user) => Math.max(max, user.id), 0);
    const newId = maxId + 1;

    // Create new user
    const newUser = {
      id: newId,
      username: username,
      password: password,
      email: email,
      fullName: fullName,
      avatarUrl: avatarUrl,
      status: false,
      roleId: roleId || null,
      loginCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    };

    users.push(newUser);
    writeUsers(users);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({
      message: "Error creating user",
      error: error.message,
    });
  }
});

/**
 * PUT /api/v1/users/:id
 * Update an existing user
 * Body: { username, password, email, fullName, avatarUrl, roleId, loginCount } (all optional)
 */
router.put("/:id", function (req, res, next) {
  try {
    const users = readUsers();
    const roles = readRoles();
    const userId = parseInt(req.params.id);
    const {
      username,
      password,
      email,
      fullName,
      avatarUrl,
      roleId,
      loginCount,
    } = req.body;

    const userIndex = users.findIndex((u) => u.id === userId && !u.deleted);

    if (userIndex === -1) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if new username already exists (excluding current user)
    if (username) {
      const existingUsername = users.find(
        (u) => u.username === username && u.id !== userId && !u.deleted,
      );
      if (existingUsername) {
        return res.status(400).json({
          message: "Username already exists",
        });
      }
      users[userIndex].username = username;
    }

    // Check if new email already exists (excluding current user)
    if (email) {
      const existingEmail = users.find(
        (u) => u.email === email && u.id !== userId && !u.deleted,
      );
      if (existingEmail) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }
      users[userIndex].email = email;
    }

    // Validate roleId if provided
    if (roleId) {
      const role = roles.find((r) => r.id === roleId && !r.deleted);
      if (!role) {
        return res.status(400).json({
          message: "Invalid role ID",
        });
      }
      users[userIndex].roleId = roleId;
    }

    if (password) users[userIndex].password = password;
    if (fullName !== undefined) users[userIndex].fullName = fullName;
    if (avatarUrl) users[userIndex].avatarUrl = avatarUrl;
    if (loginCount !== undefined && loginCount >= 0)
      users[userIndex].loginCount = loginCount;

    users[userIndex].updatedAt = new Date().toISOString();

    writeUsers(users);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = users[userIndex];

    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({
      message: "Error updating user",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v1/users/:id
 * Soft delete a user (set deleted flag to true)
 */
router.delete("/:id", function (req, res, next) {
  try {
    const users = readUsers();
    const userId = parseInt(req.params.id);

    const userIndex = users.findIndex((u) => u.id === userId && !u.deleted);

    if (userIndex === -1) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Soft delete - set deleted flag to true
    users[userIndex].deleted = true;
    users[userIndex].updatedAt = new Date().toISOString();

    writeUsers(users);

    // Remove password from response
    const { password, ...userWithoutPassword } = users[userIndex];

    res.json({
      message: "User soft deleted successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting user",
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/users/enable
 * Enable a user account (set status to true)
 * Body: { email, username }
 */
router.post("/enable", function (req, res, next) {
  try {
    const users = readUsers();
    const { email, username } = req.body;

    // Validation
    if (!email || !username) {
      return res.status(400).json({
        message: "Email and username are required",
      });
    }

    // Find user by email and username
    const userIndex = users.findIndex(
      (u) => u.email === email && u.username === username && !u.deleted,
    );

    if (userIndex === -1) {
      return res.status(404).json({
        message: "User not found or information incorrect",
      });
    }

    // Enable user
    users[userIndex].status = true;
    users[userIndex].updatedAt = new Date().toISOString();

    writeUsers(users);

    // Remove password from response
    const { password, ...userWithoutPassword } = users[userIndex];

    res.json({
      message: "User enabled successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error enabling user",
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/users/disable
 * Disable a user account (set status to false)
 * Body: { email, username }
 */
router.post("/disable", function (req, res, next) {
  try {
    const users = readUsers();
    const { email, username } = req.body;

    // Validation
    if (!email || !username) {
      return res.status(400).json({
        message: "Email and username are required",
      });
    }

    // Find user by email and username
    const userIndex = users.findIndex(
      (u) => u.email === email && u.username === username && !u.deleted,
    );

    if (userIndex === -1) {
      return res.status(404).json({
        message: "User not found or information incorrect",
      });
    }

    // Disable user
    users[userIndex].status = false;
    users[userIndex].updatedAt = new Date().toISOString();

    writeUsers(users);

    // Remove password from response
    const { password, ...userWithoutPassword } = users[userIndex];

    res.json({
      message: "User disabled successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error disabling user",
      error: error.message,
    });
  }
});

module.exports = router;
