var fs = require('fs');
var path = require('path');

const DATA_PATH = path.join(__dirname, '../data/roles.json');

/**
 * Read roles from file
 */
function readRoles() {
  const data = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(data);
}

/**
 * Write roles to file
 */
function writeRoles(roles) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(roles, null, 2), 'utf8');
}

/**
 * Get all roles (excluding soft-deleted)
 * @param {Object} filters - Filter options { name }
 * @returns {Array} Array of roles
 */
function getAllRoles(filters = {}) {
  let roles = readRoles();
  
  // Filter out soft-deleted roles
  roles = roles.filter(role => !role.deleted);
  
  // Filter by name if provided
  if (filters.name) {
    roles = roles.filter(role => 
      role.name.toLowerCase().includes(filters.name.toLowerCase())
    );
  }
  
  return roles;
}

/**
 * Get role by ID
 * @param {Number} id - Role ID
 * @returns {Object|null} Role object or null if not found
 */
function getRoleById(id) {
  const roles = readRoles();
  const role = roles.find(r => r.id === id && !r.deleted);
  return role || null;
}

/**
 * Create a new role
 * @param {Object} roleData - Role data { name, description }
 * @returns {Object} Result object { success, data, error }
 */
function createRole(roleData) {
  try {
    const roles = readRoles();
    const { name, description = "" } = roleData;
    
    // Validation
    if (!name) {
      return { success: false, error: 'Name is required' };
    }
    
    // Check if name already exists
    const existingRole = roles.find(r => r.name === name && !r.deleted);
    if (existingRole) {
      return { success: false, error: 'Role name already exists' };
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
      deleted: false
    };
    
    roles.push(newRole);
    writeRoles(roles);
    
    return { success: true, data: newRole };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing role
 * @param {Number} id - Role ID
 * @param {Object} updateData - Update data { name, description }
 * @returns {Object} Result object { success, data, error }
 */
function updateRole(id, updateData) {
  try {
    const roles = readRoles();
    const { name, description } = updateData;
    
    const roleIndex = roles.findIndex(r => r.id === id && !r.deleted);
    
    if (roleIndex === -1) {
      return { success: false, error: 'Role not found' };
    }
    
    // Check if new name already exists (excluding current role)
    if (name) {
      const existingRole = roles.find(r => r.name === name && r.id !== id && !r.deleted);
      if (existingRole) {
        return { success: false, error: 'Role name already exists' };
      }
      roles[roleIndex].name = name;
    }
    
    if (description !== undefined) {
      roles[roleIndex].description = description;
    }
    
    roles[roleIndex].updatedAt = new Date().toISOString();
    
    writeRoles(roles);
    
    return { success: true, data: roles[roleIndex] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Soft delete a role
 * @param {Number} id - Role ID
 * @returns {Object} Result object { success, data, error }
 */
function deleteRole(id) {
  try {
    const roles = readRoles();
    
    const roleIndex = roles.findIndex(r => r.id === id && !r.deleted);
    
    if (roleIndex === -1) {
      return { success: false, error: 'Role not found' };
    }
    
    // Soft delete - set deleted flag to true
    roles[roleIndex].deleted = true;
    roles[roleIndex].updatedAt = new Date().toISOString();
    
    writeRoles(roles);
    
    return { success: true, data: roles[roleIndex] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};
