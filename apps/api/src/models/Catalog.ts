import { Schema, model, Types } from 'mongoose';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    emoji: { type: String, default: '🍽️' },
  },
  { timestamps: true },
);
export const FoodCategory = model('FoodCategory', categorySchema);

const restaurantSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '', maxlength: 300 },
    cuisines: { type: [String], default: [], index: true },
    image: String, // set by Cloudinary uploads later; UI falls back to the emoji tile
    emoji: { type: String, default: '🍽️' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    deliveryMins: { type: Number, default: 30 },
    priceForTwo: { type: Number, default: 0 }, // paise
    isOpen: { type: Boolean, default: true },
    isVeg: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true },
  },
  { timestamps: true },
);
restaurantSchema.index({ status: 1, rating: -1 });
export const Restaurant = model('Restaurant', restaurantSchema);

const foodSchema = new Schema(
  {
    restaurant: { type: Types.ObjectId, ref: 'Restaurant', required: true },
    category: { type: Types.ObjectId, ref: 'FoodCategory', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 300 },
    price: { type: Number, required: true, min: 0 }, // paise
    isVeg: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    image: String,
  },
  { timestamps: true },
);
foodSchema.index({ restaurant: 1, category: 1 });
foodSchema.index({ isBestseller: 1, isAvailable: 1 });
export const Food = model('Food', foodSchema);
