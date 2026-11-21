import { Schema, model, Types } from 'mongoose';

const reviewSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: Types.ObjectId, ref: 'Restaurant', required: true },
    order: { type: Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

reviewSchema.index({ restaurant: 1, createdAt: -1 });
reviewSchema.index({ user: 1, order: 1 }, { unique: true });

export const Review = model('Review', reviewSchema);
