import { Restaurant } from '../models/Catalog';
import { Order } from '../models/Commerce';
import { Review } from '../models/Review';
import { AppError } from '../utils/AppError';

export async function addReview(
  userId: string,
  data: {
    orderId: string;
    rating: number;
    comment?: string;
  },
) {
  const order = await Order.findOne({ _id: data.orderId, user: userId });
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
  if (order.status !== 'delivered') {
    throw new AppError(409, 'Only delivered orders can be reviewed', 'ORDER_NOT_DELIVERED');
  }

  const existing = await Review.findOne({ user: userId, order: order._id });
  if (existing) throw new AppError(409, 'You have already reviewed this order', 'ALREADY_REVIEWED');

  const review: any = await Review.create({
    user: userId,
    restaurant: order.restaurant as any,
    order: order._id,
    rating: data.rating,
    comment: data.comment || '',
  });

  order.reviewed = true;
  await order.save();

  // Recalculate restaurant rating
  const reviews = await Review.find({ restaurant: order.restaurant as any });
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await Restaurant.updateOne(
    { _id: order.restaurant as any },
    { rating: Math.round(avg * 10) / 10, ratingCount: reviews.length },
  );

  return review.populate('user', 'name');
}

export async function getRestaurantReviews(restaurantId: string, page = 1, limit = 10) {
  const [items, total] = await Promise.all([
    Review.find({ restaurant: restaurantId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments({ restaurant: restaurantId }),
  ]);

  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
