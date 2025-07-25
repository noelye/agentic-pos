import { Router } from 'express';
import { MenuItemModel, MenuCategoryModel } from '../models/menu';

const router = Router();

// Get all menu items
router.get('/items', async (req, res) => {
  try {
    const { category, available } = req.query;
    const filter: any = {};
    
    if (category) filter.category = category;
    if (available !== undefined) filter.available = available === 'true';
    
    const items = await MenuItemModel.find(filter).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    console.error('❌ Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get menu items by category
router.get('/items/category/:category', async (req, res) => {
  try {
    const items = await MenuItemModel.find({ 
      category: req.params.category,
      available: true 
    }).sort({ name: 1 });
    res.json(items);
  } catch (error) {
    console.error('❌ Error fetching menu items by category:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get single menu item
router.get('/items/:id', async (req, res) => {
  try {
    const item = await MenuItemModel.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('❌ Error fetching menu item:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// Create new menu item (admin)
router.post('/items', async (req, res) => {
  try {
    const item = await MenuItemModel.create(req.body);
    console.log('📝 Menu item created:', item.name);
    res.status(201).json(item);
  } catch (error) {
    console.error('❌ Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item (admin)
router.put('/items/:id', async (req, res) => {
  try {
    const item = await MenuItemModel.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    console.log('📝 Menu item updated:', item.name);
    res.json(item);
  } catch (error) {
    console.error('❌ Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await MenuCategoryModel.find().sort({ displayOrder: 1 });
    res.json(categories);
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category (admin)
router.post('/categories', async (req, res) => {
  try {
    const category = await MenuCategoryModel.create(req.body);
    console.log('📁 Category created:', category.name);
    res.status(201).json(category);
  } catch (error) {
    console.error('❌ Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

export default router; 