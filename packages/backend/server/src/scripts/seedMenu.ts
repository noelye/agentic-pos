import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { MenuItemModel, MenuCategoryModel } from '../models/menu';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '../../../.env') });

const sampleCategories = [
  { name: 'Burgers', description: 'Juicy beef, chicken, and plant-based burgers', displayOrder: 1 },
  { name: 'Sides', description: 'Fries, onion rings, and other tasty sides', displayOrder: 2 },
  { name: 'Beverages', description: 'Soft drinks, juices, and specialty drinks', displayOrder: 3 },
  { name: 'Desserts', description: 'Sweet treats to finish your meal', displayOrder: 4 },
  { name: 'Salads', description: 'Fresh and healthy salad options', displayOrder: 5 }
];

const sampleMenuItems = [
  // Burgers
  {
    name: 'Classic Cheeseburger',
    description: 'Beef patty with cheddar cheese, lettuce, tomato, and our special sauce',
    priceUsd: 12.99,
    category: 'Burgers',
    dietaryTags: [],
    available: true,
    preparationTime: 8,
    calories: 650,
    ingredients: ['beef patty', 'cheddar cheese', 'lettuce', 'tomato', 'special sauce', 'brioche bun']
  },
  {
    name: 'BBQ Bacon Burger',
    description: 'Beef patty with crispy bacon, BBQ sauce, onion rings, and cheddar',
    priceUsd: 15.99,
    category: 'Burgers',
    dietaryTags: [],
    available: true,
    preparationTime: 10,
    calories: 780,
    ingredients: ['beef patty', 'bacon', 'BBQ sauce', 'onion rings', 'cheddar cheese', 'brioche bun']
  },
  {
    name: 'Veggie Delight Burger',
    description: 'Plant-based patty with avocado, sprouts, and herb mayo',
    priceUsd: 13.99,
    category: 'Burgers',
    dietaryTags: ['vegetarian', 'vegan'],
    available: true,
    preparationTime: 7,
    calories: 520,
    ingredients: ['plant-based patty', 'avocado', 'sprouts', 'herb mayo', 'whole grain bun']
  },
  
  // Sides
  {
    name: 'Crispy Fries',
    description: 'Golden crispy potato fries with sea salt',
    priceUsd: 4.99,
    category: 'Sides',
    dietaryTags: ['vegetarian', 'vegan'],
    available: true,
    preparationTime: 4,
    calories: 320,
    ingredients: ['potatoes', 'sea salt', 'vegetable oil']
  },
  {
    name: 'Onion Rings',
    description: 'Beer-battered onion rings with ranch dipping sauce',
    priceUsd: 6.99,
    category: 'Sides',
    dietaryTags: ['vegetarian'],
    available: true,
    preparationTime: 5,
    calories: 410,
    ingredients: ['onions', 'beer batter', 'ranch sauce']
  },
  
  // Beverages
  {
    name: 'Craft Cola',
    description: 'House-made cola with natural ingredients',
    priceUsd: 3.99,
    category: 'Beverages',
    dietaryTags: ['vegetarian', 'vegan'],
    available: true,
    preparationTime: 1,
    calories: 150,
    ingredients: ['carbonated water', 'natural cola flavor', 'cane sugar']
  },
  {
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice',
    priceUsd: 4.99,
    category: 'Beverages',
    dietaryTags: ['vegetarian', 'vegan', 'fresh'],
    available: true,
    preparationTime: 2,
    calories: 110,
    ingredients: ['fresh oranges']
  },
  
  // Desserts
  {
    name: 'Chocolate Brownie',
    description: 'Warm chocolate brownie with vanilla ice cream',
    priceUsd: 7.99,
    category: 'Desserts',
    dietaryTags: ['vegetarian'],
    available: true,
    preparationTime: 3,
    calories: 480,
    ingredients: ['chocolate', 'flour', 'eggs', 'butter', 'vanilla ice cream']
  },
  
  // Salads
  {
    name: 'Garden Fresh Salad',
    description: 'Mixed greens with cherry tomatoes, cucumber, and balsamic dressing',
    priceUsd: 9.99,
    category: 'Salads',
    dietaryTags: ['vegetarian', 'vegan', 'healthy'],
    available: true,
    preparationTime: 5,
    calories: 180,
    ingredients: ['mixed greens', 'cherry tomatoes', 'cucumber', 'balsamic dressing']
  }
];

async function seedMenu() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('🔌 Connected to MongoDB for seeding');

    // Clear existing data
    await MenuCategoryModel.deleteMany({});
    await MenuItemModel.deleteMany({});
    console.log('🧹 Cleared existing menu data');

    // Insert categories
    const categories = await MenuCategoryModel.create(sampleCategories);
    console.log(`📁 Created ${categories.length} categories`);

    // Insert menu items
    const items = await MenuItemModel.create(sampleMenuItems);
    console.log(`📝 Created ${items.length} menu items`);

    console.log('✅ Menu seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding menu:', error);
    process.exit(1);
  }
}

seedMenu(); 