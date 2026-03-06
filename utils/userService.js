var fs = require('fs');
var path = require('path');
var bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const DATA_PATH = path.join(__dirname, '../data/users.json');
const ROLES_PATH = path.join(__dirname, '../data/roles.json');

/**
 * Read users from file
 */
function readUsers() {
  const data = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(data);
}

/**
 * Write users to file
 */
function writeUsers(users) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(users, null, 2), 'utf8');
}

/**
 * Read roles from file
 */
function readRoles() {
  const data = fs.readFileSync(ROLES_PATH, 'utf8');
  return JSON.parse(data);
}

/**
 * Remove password from user object
 */
function removePassword(user) {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Get all users (excluding soft-deleted)
 * @param {Object} filters - Filter options { username, email, status }
 * @returns {Array} Array of users (without passwords)
 */
function getAllUsers(filters = {}) {
  let users = readUsers();
  
  // Filter out soft-deleted users
  users = users.filter(user => !user.deleted);
  
  // Filter by username if provided
  if (filters.username) {
    users = users.filter(user => 
      user.username.toLowerCase().includes(filters.username.toLowerCase())
    );
  }
  
  // Filter by email if provided
  if (filters.email) {
    users = users.filter(user => 
      user.email.toLowerCase().includes(filters.email.toLowerCase())
    );
  }
  
  // Filter by status if provided
  if (filters.status !== undefined) {
    const status = filters.status === 'true' || filters.status === true;
    users = users.filter(user => user.status === status);
  }
  
  // Remove passwords from response
  return users.map(removePassword);
}

/**
 * Get user by ID
 * @param {Number} id - User ID
 * @returns {Object|null} User object (without password) or null if not found
 */
function getUserById(id) {
  const users = readUsers();
  const user = users.find(u => u.id === id && !u.deleted);
  return user ? removePassword(user) : null;
}

/**
 * Create a new user
 * @param {Object} userData - User data { username, password, email, fullName, avatarUrl, roleId }
 * @returns {Object} Result object { success, data, error }
 */
async function createUser(userData) {
  try {
    const users = readUsers();
    const roles = readRoles();
    const { 
      username, 
      password, 
      email, 
      fullName = "",
      avatarUrl = "https://i.sstatic.net/l60Hf.png",
      roleId
    } = userData;
    
    // Validation
    if (!username || !password || !email) {
      return { success: false, error: 'Username, password, and email are required' };
    }
    
    // Check if username already exists
    const existingUsername = users.find(u => u.username === username && !u.deleted);
    if (existingUsername) {
      return { success: false, error: 'Username already exists' };
    }
    
    // Check if email already exists
    const existingEmail = users.find(u => u.email === email && !u.deleted);
    if (existingEmail) {
      return { success: false, error: 'Email already exists' };
    }
    
    // Validate roleId if provided
    if (roleId) {
      const role = roles.find(r => r.id === roleId && !r.deleted);
      if (!role) {
        return { success: false, error: 'Invalid role ID' };
      }
    }
    
    // Generate new ID (max ID + 1)
    const maxId = users.reduce((max, user) => Math.max(max, user.id), 0);
    const newId = maxId + 1;
    
    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create new user
    const newUser = {
      id: newId,
      username: username,
      password: hashedPassword,
      email: email,
      fullName: fullName,
      avatarUrl: avatarUrl,
      status: false,
      roleId: roleId || null,
      loginCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false
    };
    
    users.push(newUser);
    writeUsers(users);
    
    return { success: true, data: removePassword(newUser) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing user
 * @param {Number} id - User ID
 * @param {Object} updateData - Update data { username, password, email, fullName, avatarUrl, roleId, loginCount }
 * @returns {Object} Result object { success, data, error }
 */
async function updateUser(id, updateData) {
  try {
    const users = readUsers();
    const roles = readRoles();
    const { username, password, email, fullName, avatarUrl, roleId, loginCount } = updateData;
    
    const userIndex = users.findIndex(u => u.id === id && !u.deleted);
    
    if (userIndex === -1) {
      return { success: false, error: 'User not found' };
    }
    
    // Check if new username already exists (excluding current user)
    if (username) {
      const existingUsername = users.find(u => u.username === username && u.id !== id && !u.deleted);
      if (existingUsername) {
        return { success: false, error: 'Username already exists' };
      }
      users[userIndex].username = username;
    }
    
    // Check if new email already exists (excluding current user)
    if (email) {
      const existingEmail = users.find(u => u.email === email && u.id !== id && !u.deleted);
      if (existingEmail) {
        return { success: false, error: 'Email already exists' };
      }
      users[userIndex].email = email;
    }
    
    // Validate roleId if provided
    if (roleId) {
      const role = roles.find(r => r.id === roleId && !r.deleted);
      if (!role) {
        return { success: false, error: 'Invalid role ID' };
      }
      users[userIndex].roleId = roleId;
    }
    
    // Hash password with bcrypt if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      users[userIndex].password = hashedPassword;
    }
    if (fullName !== undefined) users[userIndex].fullName = fullName;
    if (avatarUrl) users[userIndex].avatarUrl = avatarUrl;
    if (loginCount !== undefined && loginCount >= 0) users[userIndex].loginCount = loginCount;
    
    users[userIndex].updatedAt = new Date().toISOString();
    
    writeUsers(users);
    
    return { success: true, data: removePassword(users[userIndex]) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Soft delete a user
 * @param {Number} id - User ID
 * @returns {Object} Result object { success, data, error }
 */
function deleteUser(id) {
  try {
    const users = readUsers();
    
    const userIndex = users.findIndex(u => u.id === id && !u.deleted);
    
    if (userIndex === -1) {
      return { success: false, error: 'User not found' };
    }
    
    // Soft delete - set deleted flag to true
    users[userIndex].deleted = true;
    users[userIndex].updatedAt = new Date().toISOString();
    
    writeUsers(users);
    
    return { success: true, data: removePassword(users[userIndex]) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Enable user account (set status to true)
 * @param {String} email - User email
 * @param {String} username - User username
 * @returns {Object} Result object { success, data, error }
 */
function enableUser(email, username) {
  try {
    const users = readUsers();
    
    // Validation
    if (!email || !username) {
      return { success: false, error: 'Email and username are required' };
    }
    
    // Find user by email and username
    const userIndex = users.findIndex(u => 
      u.email === email && 
      u.username === username && 
      !u.deleted
    );
    
    if (userIndex === -1) {
      return { success: false, error: 'User not found or information incorrect' };
    }
    
    // Enable user
    users[userIndex].status = true;
    users[userIndex].updatedAt = new Date().toISOString();
    
    writeUsers(users);
    
    return { success: true, data: removePassword(users[userIndex]) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Disable user account (set status to false)
 * @param {String} email - User email
 * @param {String} username - User username
 * @returns {Object} Result object { success, data, error }
 */
function disableUser(email, username) {
  try {
    const users = readUsers();
    
    // Validation
    if (!email || !username) {
      return { success: false, error: 'Email and username are required' };
    }
    
    // Find user by email and username
    const userIndex = users.findIndex(u => 
      u.email === email && 
      u.username === username && 
      !u.deleted
    );
    
    if (userIndex === -1) {
      return { success: false, error: 'User not found or information incorrect' };
    }
    
    // Disable user
    users[userIndex].status = false;
    users[userIndex].updatedAt = new Date().toISOString();
    
    writeUsers(users);
    
    return { success: true, data: removePassword(users[userIndex]) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Compare a plain text password with a hashed password
 * @param {String} plainPassword - Plain text password
 * @param {String} hashedPassword - Hashed password from database
 * @returns {Promise<Boolean>} True if passwords match
 */
async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  enableUser,
  disableUser,
  comparePassword
};
