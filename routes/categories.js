var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');

// Helper function to read categories from file
function readCategories() {
  const dataPath = path.join(__dirname, '../data/categories.json');
  const data = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(data);
}

// Helper function to write categories to file
function writeCategories(categories) {
  const dataPath = path.join(__dirname, '../data/categories.json');
  fs.writeFileSync(dataPath, JSON.stringify(categories, null, 2), 'utf8');
}

// Helper function to read products from file
function readProducts() {
  const dataPath = path.join(__dirname, '../data/products.json');
  const data = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(data);
}

// Helper function to generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * GET /api/v1/categories
 * Get all categories with optional name filter
 * Query params: name (optional) - filter by name (case-insensitive partial match)
 */
router.get('/', function(req, res, next) {
  try {
    let categories = readCategories();
    
    // Filter by name if query parameter is provided
    const nameFilter = req.query.name;
    if (nameFilter) {
      categories = categories.filter(category => 
        category.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error reading categories', 
      error: error.message 
    });
  }
});

/**
 * GET /api/v1/categories/:id
 * Get category by ID
 */
router.get('/:id', function(req, res, next) {
  try {
    const categories = readCategories();
    const categoryId = parseInt(req.params.id);
    
    const category = categories.find(c => c.id === categoryId);
    
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found' 
      });
    }
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error reading category', 
      error: error.message 
    });
  }
});

/**
 * GET /api/v1/categories/slug/:slug
 * Get category by slug
 */
router.get('/slug/:slug', function(req, res, next) {
  try {
    const categories = readCategories();
    const slug = req.params.slug;
    
    const category = categories.find(c => c.slug === slug);
    
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found' 
      });
    }
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error reading category', 
      error: error.message 
    });
  }
});

/**
 * GET /api/v1/categories/:id/products
 * Get all products for a specific category
 */
router.get('/:id/products', function(req, res, next) {
  try {
    const categoryId = parseInt(req.params.id);
    const products = readProducts();
    
    // Filter products by category ID
    const categoryProducts = products.filter(p => p.categoryId === categoryId);
    
    res.json(categoryProducts);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error reading products', 
      error: error.message 
    });
  }
});

/**
 * POST /api/v1/categories
 * Create a new category
 * Body: { name, image }
 */
router.post('/', function(req, res, next) {
  try {
    const categories = readCategories();
    const { name, image } = req.body;
    
    // Validation
    if (!name || !image) {
      return res.status(400).json({ 
        message: 'Name and image are required' 
      });
    }
    
    // Generate new ID (max ID + 1)
    const maxId = categories.reduce((max, cat) => Math.max(max, cat.id), 0);
    const newId = maxId + 1;
    
    // Generate slug
    const slug = generateSlug(name);
    
    // Create new category
    const newCategory = {
      id: newId,
      name: name,
      slug: slug,
      image: image,
      creationAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    categories.push(newCategory);
    writeCategories(categories);
    
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating category', 
      error: error.message 
    });
  }
});

/**
 * PUT /api/v1/categories/:id
 * Update an existing category
 * Body: { name, image } (both optional)
 */
router.put('/:id', function(req, res, next) {
  try {
    const categories = readCategories();
    const categoryId = parseInt(req.params.id);
    const { name, image } = req.body;
    
    const categoryIndex = categories.findIndex(c => c.id === categoryId);
    
    if (categoryIndex === -1) {
      return res.status(404).json({ 
        message: 'Category not found' 
      });
    }
    
    // Update category fields
    if (name) {
      categories[categoryIndex].name = name;
      categories[categoryIndex].slug = generateSlug(name);
    }
    if (image) {
      categories[categoryIndex].image = image;
    }
    
    categories[categoryIndex].updatedAt = new Date().toISOString();
    
    writeCategories(categories);
    
    res.json(categories[categoryIndex]);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating category', 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/v1/categories/:id
 * Delete a category
 */
router.delete('/:id', function(req, res, next) {
  try {
    const categories = readCategories();
    const categoryId = parseInt(req.params.id);
    
    const categoryIndex = categories.findIndex(c => c.id === categoryId);
    
    if (categoryIndex === -1) {
      return res.status(404).json({ 
        message: 'Category not found' 
      });
    }
    
    const deletedCategory = categories.splice(categoryIndex, 1)[0];
    writeCategories(categories);
    
    res.json({ 
      message: 'Category deleted successfully',
      category: deletedCategory
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting category', 
      error: error.message 
    });
  }
});

module.exports = router;
