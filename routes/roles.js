var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");

// Helper function to read roles from file
function readRoles() {
  const dataPath = path.join(__dirname, "../data/roles.json");
  const data = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(data);
}

// Helper function to write roles to file
function writeRoles(roles) {
  const dataPath = path.join(__dirname, "../data/roles.json");
  fs.writeFileSync(dataPath, JSON.stringify(roles, null, 2), "utf8");
}

/**
 * GET /api/v1/roles
 * Get all roles (excluding soft-deleted)
 * Query params: name (optional) - filter by name
 */
router.get("/", function (req, res, next) {
  try {
    let roles = readRoles();

    // Filter out soft-deleted roles
    roles = roles.filter((role) => !role.deleted);

    // Filter by name if query parameter is provided
    const nameFilter = req.query.name;
    if (nameFilter) {
      roles = roles.filter((role) =>
        role.name.toLowerCase().includes(nameFilter.toLowerCase()),
      );
    }

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
    const roles = readRoles();
    const roleId = parseInt(req.params.id);

    const role = roles.find((r) => r.id === roleId && !r.deleted);

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
  try {
    const roles = readRoles();
    const { name, description = "" } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    // Check if name already exists
    const existingRole = roles.find((r) => r.name === name && !r.deleted);
    if (existingRole) {
      return res.status(400).json({
        message: "Role name already exists",
      });
    }

    // Generate new ID (max ID + 1)
    const maxId = roles.reduce((max, role) => Math.max(max, role.id), 0);
    const newId = maxId + 1;

    // Create new role
    const newRole = {
      id: newId,
      name: name,
      description: description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    };

    roles.push(newRole);
    writeRoles(roles);

    res.status(201).json(newRole);
  } catch (error) {
    res.status(500).json({
      message: "Error creating role",
      error: error.message,
    });
  }
});

/**
 * PUT /api/v1/roles/:id
 * Update an existing role
 * Body: { name, description } (both optional)
 */
router.put("/:id", function (req, res, next) {
  try {
    const roles = readRoles();
    const roleId = parseInt(req.params.id);
    const { name, description } = req.body;

    const roleIndex = roles.findIndex((r) => r.id === roleId && !r.deleted);

    if (roleIndex === -1) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    // Check if new name already exists (excluding current role)
    if (name) {
      const existingRole = roles.find(
        (r) => r.name === name && r.id !== roleId && !r.deleted,
      );
      if (existingRole) {
        return res.status(400).json({
          message: "Role name already exists",
        });
      }
      roles[roleIndex].name = name;
    }

    if (description !== undefined) {
      roles[roleIndex].description = description;
    }

    roles[roleIndex].updatedAt = new Date().toISOString();

    writeRoles(roles);

    res.json(roles[roleIndex]);
  } catch (error) {
    res.status(500).json({
      message: "Error updating role",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v1/roles/:id
 * Soft delete a role (set deleted flag to true)
 */
router.delete("/:id", function (req, res, next) {
  try {
    const roles = readRoles();
    const roleId = parseInt(req.params.id);

    const roleIndex = roles.findIndex((r) => r.id === roleId && !r.deleted);

    if (roleIndex === -1) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    // Soft delete - set deleted flag to true
    roles[roleIndex].deleted = true;
    roles[roleIndex].updatedAt = new Date().toISOString();

    writeRoles(roles);

    res.json({
      message: "Role soft deleted successfully",
      role: roles[roleIndex],
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting role",
      error: error.message,
    });
  }
});

module.exports = router;
