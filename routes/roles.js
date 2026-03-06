var express = require("express");
var router = express.Router();
var roleService = require("../utils/roleService");

/**
 * GET /api/v1/roles
 * Get all roles (excluding soft-deleted)
 * Query params: name (optional) - filter by name
 */
router.get("/", function (req, res, next) {
  try {
    const filters = {
      name: req.query.name
    };
    const roles = roleService.getAllRoles(filters);
    res.json(roles);
  } catch (error) {
    res.status(500).json({
      message: "Error reading roles",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/roles/:id
 * Get role by ID
 */
router.get("/:id", function (req, res, next) {
  try {
    const roleId = parseInt(req.params.id);
    const role = roleService.getRoleById(roleId);

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    res.json(role);
  } catch (error) {
    res.status(500).json({
      message: "Error reading role",
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/roles
 * Create a new role
 * Body: { name, description }
 */
router.post("/", function (req, res, next) {
  const result = roleService.createRole(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      message: result.error
    });
  }
  
  res.status(201).json(result.data);
});

/**
 * PUT /api/v1/roles/:id
 * Update an existing role
 * Body: { name, description } (both optional)
 */
router.put("/:id", function (req, res, next) {
  const roleId = parseInt(req.params.id);
  const result = roleService.updateRole(roleId, req.body);
  
  if (!result.success) {
    const statusCode = result.error === 'Role not found' ? 404 : 400;
    return res.status(statusCode).json({
      message: result.error
    });
  }
  
  res.json(result.data);
});

/**
 * DELETE /api/v1/roles/:id
 * Soft delete a role (set deleted flag to true)
 */
router.delete("/:id", function (req, res, next) {
  const roleId = parseInt(req.params.id);
  const result = roleService.deleteRole(roleId);
  
  if (!result.success) {
    return res.status(404).json({
      message: result.error
    });
  }
  
  res.json({
    message: "Role soft deleted successfully",
    role: result.data,
  });
});

module.exports = router;
