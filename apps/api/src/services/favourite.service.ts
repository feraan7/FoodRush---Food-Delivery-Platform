import { Food, Restaurant } from '../models/Catalog';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';

export async function toggleFavourite(userId: string, type: 'restaurant' | 'food', targetId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  if (!user.favourites) {
    user.favourites = { restaurants: [], foods: [] };
  }

  const list = type === 'restaurant' ? user.favourites.restaurants : user.favourites.foods;
  const idx = list.findIndex((id) => String(id) === targetId);

  let isFavourite: boolean;
  if (idx !== -1) {
    list.splice(idx, 1);
    isFavourite = false;
  } else {
    // Verify target exists
    if (type === 'restaurant') {
      const exists = await Restaurant.exists({ _id: targetId });
      if (!exists) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');
    } else {
      const exists = await Food.exists({ _id: targetId });
      if (!exists) throw new AppError(404, 'Food item not found', 'NOT_FOUND');
    }
    list.push(targetId as any);
    isFavourite = true;
  }

  await user.save();
  return { isFavourite, type, id: targetId };
}

export async function getFavourites(userId: string) {
  const user = await User.findById(userId)
    .populate({
      path: 'favourites.restaurants',
      model: 'Restaurant',
      select: 'name slug cuisines image emoji rating ratingCount deliveryMins priceForTwo isOpen',
    })
    .populate({
      path: 'favourites.foods',
      model: 'Food',
      populate: [
        { path: 'restaurant', select: 'name slug' },
        { path: 'category', select: 'name slug emoji' },
      ],
    })
    .lean();

  return {
    restaurants: user?.favourites?.restaurants || [],
    foods: user?.favourites?.foods || [],
  };
}
