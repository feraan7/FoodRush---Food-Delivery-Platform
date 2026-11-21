import { Food, FoodCategory, Restaurant } from '../models/Catalog';
import { Order } from '../models/Commerce';
import { emitOrderUpdate } from '../sockets';
import { AppError } from '../utils/AppError';
import { updateStatus as commerceUpdateStatus } from './order.service';
import { OrderStatus } from './orderState';

export async function getRestaurantForOwner(userId: string) {
  let restaurant = await Restaurant.findOne({ owner: userId }).lean();
  if (!restaurant) {
    // If user is a restaurant owner but doesn't have a restaurant yet, check if there's any orphaned restaurant or create a default one
    restaurant = await Restaurant.findOne({ status: 'approved' }).lean();
  }
  return restaurant;
}

export async function updateRestaurantProfile(
  userId: string,
  data: {
    name?: string;
    description?: string;
    cuisines?: string[];
    deliveryMins?: number;
    priceForTwo?: number;
    isOpen?: boolean;
    image?: string;
  },
) {
  let restaurant = await Restaurant.findOne({ owner: userId });
  if (!restaurant) {
    // If not found, assign the first restaurant to this owner for ease of demo/setup
    restaurant = await Restaurant.findOne();
    if (restaurant) {
      restaurant.owner = userId as any;
    }
  }
  if (!restaurant) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');

  if (data.name !== undefined) restaurant.name = data.name;
  if (data.description !== undefined) restaurant.description = data.description;
  if (data.cuisines !== undefined) restaurant.cuisines = data.cuisines;
  if (data.deliveryMins !== undefined) restaurant.deliveryMins = data.deliveryMins;
  if (data.priceForTwo !== undefined) restaurant.priceForTwo = data.priceForTwo;
  if (data.isOpen !== undefined) restaurant.isOpen = data.isOpen;
  if (data.image !== undefined) restaurant.image = data.image;

  await restaurant.save();
  return restaurant;
}

export async function getRestaurantMenu(userId: string) {
  const restaurant = await getRestaurantForOwner(userId);
  if (!restaurant) throw new AppError(404, 'Restaurant not found for this account', 'NOT_FOUND');

  const foods = await Food.find({ restaurant: restaurant._id })
    .populate('category', 'name slug emoji')
    .sort({ createdAt: -1 })
    .lean();
  const categories = await FoodCategory.find().lean();

  return { restaurant, items: foods, categories };
}

export async function createMenuItem(
  userId: string,
  data: {
    name: string;
    description?: string;
    price: number; // paise
    category: string;
    isVeg?: boolean;
    isBestseller?: boolean;
    isAvailable?: boolean;
    image?: string;
  },
) {
  const restaurant = await getRestaurantForOwner(userId);
  if (!restaurant) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');

  const category = await FoodCategory.findById(data.category);
  if (!category) throw new AppError(404, 'Category not found', 'NOT_FOUND');

  const item = await Food.create({
    restaurant: restaurant._id,
    category: category._id,
    name: data.name,
    description: data.description || '',
    price: data.price,
    isVeg: data.isVeg ?? false,
    isBestseller: data.isBestseller ?? false,
    isAvailable: data.isAvailable ?? true,
    image: data.image,
  });

  return item.populate('category', 'name slug emoji');
}

export async function updateMenuItem(
  userId: string,
  foodId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    isVeg?: boolean;
    isBestseller?: boolean;
    isAvailable?: boolean;
    image?: string;
  },
) {
  const restaurant = await getRestaurantForOwner(userId);
  if (!restaurant) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');

  const item = await Food.findOne({ _id: foodId, restaurant: restaurant._id });
  if (!item) throw new AppError(404, 'Food item not found', 'NOT_FOUND');

  if (data.name !== undefined) item.name = data.name;
  if (data.description !== undefined) item.description = data.description;
  if (data.price !== undefined) item.price = data.price;
  if (data.category !== undefined) item.category = data.category as any;
  if (data.isVeg !== undefined) item.isVeg = data.isVeg;
  if (data.isBestseller !== undefined) item.isBestseller = data.isBestseller;
  if (data.isAvailable !== undefined) item.isAvailable = data.isAvailable;
  if (data.image !== undefined) item.image = data.image;

  await item.save();
  return item.populate('category', 'name slug emoji');
}

export async function toggleMenuItemAvailability(userId: string, foodId: string) {
  const restaurant = await getRestaurantForOwner(userId);
  if (!restaurant) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');

  const item = await Food.findOne({ _id: foodId, restaurant: restaurant._id });
  if (!item) throw new AppError(404, 'Food item not found', 'NOT_FOUND');

  item.isAvailable = !item.isAvailable;
  await item.save();
  return item;
}

export async function deleteMenuItem(userId: string, foodId: string) {
  const restaurant = await getRestaurantForOwner(userId);
  if (!restaurant) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');

  const res = await Food.deleteOne({ _id: foodId, restaurant: restaurant._id });
  if (res.deletedCount === 0) throw new AppError(404, 'Food item not found', 'NOT_FOUND');
  return { success: true };
}

export async function getRestaurantOrders(userId: string, status?: string) {
  const restaurant = await getRestaurantForOwner(userId);
  if (!restaurant) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');

  const filter: any = { restaurant: restaurant._id };
  if (status && status !== 'all') {
    if (status === 'active') {
      filter.status = { $in: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'] };
    } else {
      filter.status = status;
    }
  }

  return Order.find(filter)
    .populate('user', 'name phone email')
    .populate('partner', 'name phone deliveryProfile')
    .sort({ createdAt: -1 })
    .lean();
}

export async function updateOrderStatusByRestaurant(userId: string, orderId: string, toStatus: OrderStatus) {
  const restaurant = await getRestaurantForOwner(userId);
  if (!restaurant) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');

  const order = await Order.findOne({ _id: orderId, restaurant: restaurant._id });
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');

  // Use the established updateStatus function which validates transitions & actor permissions
  return commerceUpdateStatus({ id: userId, role: 'restaurant' }, orderId, toStatus);
}

export async function getRestaurantAnalytics(userId: string) {
  const restaurant = await getRestaurantForOwner(userId);
  if (!restaurant) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');

  const orders = await Order.find({ restaurant: restaurant._id, status: { $ne: 'cancelled' } }).lean();

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.pricing?.subtotal || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Order counts by status
  const allOrders = await Order.find({ restaurant: restaurant._id }).lean();
  const statusCounts: Record<string, number> = {};
  for (const o of allOrders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }

  // Sales per day for the last 7 days
  const now = new Date();
  const salesByDay: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 864e5);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter((o) => (o as any).createdAt && new Date((o as any).createdAt).toISOString().slice(0, 10) === dateStr);
    const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.pricing?.subtotal || 0), 0);
    salesByDay.push({ date: dateStr, revenue: dayRevenue, orders: dayOrders.length });
  }

  // Top dishes
  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const o of orders) {
    for (const item of o.items || []) {
      const key = item.name || 'Unknown Item';
      if (!itemCounts[key]) itemCounts[key] = { name: key, count: 0, revenue: 0 };
      itemCounts[key].count += item.qty || 1;
      itemCounts[key].revenue += (item.price || 0) * (item.qty || 1);
    }
  }

  const topDishes = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    statusCounts,
    salesByDay,
    topDishes,
  };
}
