var express = require("express");
var router = express.Router();
var userService = require("../utils/userService");

/**
 * GET /api/v1/users
 * Get all users (excluding soft-deleted)
 * Query params: username, email, status (optional filters)
 */
router.get("/", function (req, res, next) {
  try {
    const filters = {
      username: req.query.username,
      email: req.query.email,
      status: req.query.status
    };
    const users = userService.getAllUsers(filters);
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
    const userId = parseInt(req.params.id);
    const user = userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
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
  const result = userService.createUser(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      message: result.error
    });
  }
  
  res.status(201).json(result.data);
});

/**
 * PUT /api/v1/users/:id
 * Update an existing user
 * Body: { username, password, email, fullName, avatarUrl, roleId, loginCount } (all optional)
 */
router.put("/:id", function (req, res, next) {
  const userId = parseInt(req.params.id);
  const result = userService.updateUser(userId, req.body);
  
  if (!result.success) {
    const statusCode = result.error === 'User not found' ? 404 : 400;
    return res.status(statusCode).json({
      message: result.error
    });
  }
  
  res.json(result.data);
});

/**
 * DELETE /api/v1/users/:id
 * Soft delete a user (set deleted flag to true)
 */
router.delete("/:id", function (req, res, next) {
  const userId = parseInt(req.params.id);
  const result = userService.deleteUser(userId);
  
  if (!result.success) {
    return res.status(404).json({
      message: result.error
    });
  }
  
  res.json({
    message: "User soft deleted successfully",
    user: result.data,
  });
});

/**
 * POST /api/v1/users/enable
 * Enable a user account (set status to true)
 * Body: { email, username }
 */
router.post("/enable", function (req, res, next) {
  const { email, username } = req.body;
  const result = userService.enableUser(email, username);
  
  if (!result.success) {
    const statusCode = result.error === 'Email and username are required' ? 400 : 404;
    return res.status(statusCode).json({
      message: result.error
    });
  }
  
  res.json({
    message: "User enabled successfully",
    user: result.data,
  });
});

/**
 * POST /api/v1/users/disable
 * Disable a user account (set status to false)
 * Body: { email, username }
 */
router.post("/disable", function (req, res, next) {
  const { email, username } = req.body;
  const result = userService.disableUser(email, username);
  
  if (!result.success) {
    const statusCode = result.error === 'Email and username are required' ? 400 : 404;
    return res.status(statusCode).json({
      message: result.error
    });
  }
  
  res.json({
    message: "User disabled successfully",
    user: result.data,
  });
});

module.exports = router;
