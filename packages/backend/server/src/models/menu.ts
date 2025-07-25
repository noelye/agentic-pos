import { Schema, model } from 'mongoose';
import { MenuItem, MenuCategory } from '@agentic-pos/shared';

const menuItemSchema = new Schema<MenuItem>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  priceUsd: { type: Number, required: true },
  category: { type: String, required: true },
  dietaryTags: [String],
  imageUrl: String,
  available: { type: Boolean, default: true },
  preparationTime: { type: Number, required: true },
  calories: Number,
  ingredients: [String]
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

const menuCategorySchema = new Schema<MenuCategory>({
  name: { type: String, required: true },
  description: String,
  displayOrder: { type: Number, required: true }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const MenuItemModel = model<MenuItem>('MenuItem', menuItemSchema);
export const MenuCategoryModel = model<MenuCategory>('MenuCategory', menuCategorySchema); 