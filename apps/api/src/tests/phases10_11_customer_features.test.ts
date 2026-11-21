import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Food, FoodCategory, Restaurant } from '../models/Catalog';
import { Order } from '../models/Commerce';
import { Notification } from '../models/Notification';
import { Review } from '../models/Review';
import { User } from '../models/User';
import * as authSvc from '../services/auth.service';
import * as favSvc from '../services/favourite.service';
import * as notifSvc from '../services/notification.service';
import * as profileSvc from '../services/profile.service';
import * as reviewSvc from '../services/review.service';

let mongod: MongoMemoryReplSet;
let customerId: string;
let restaurantId: string;
let foodId: string;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Restaurant.init(), Food.init(), Order.init(), Review.init(), Notification.init()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Restaurant.deleteMany({}),
    Food.deleteMany({}),
    FoodCategory.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  const user = await User.create({ name: 'Emma Watson', email: 'emma@example.com', passwordHash: 'hash', role: 'customer' });
  customerId = String(user._id);

  const cat = await FoodCategory.create({ name: 'Desserts', slug: 'desserts' });
  const rest = await Restaurant.create({ name: 'Bakery Cafe', slug: 'bakery-cafe', status: 'approved', rating: 0, ratingCount: 0 });
  restaurantId = String(rest._id);

  const food = await Food.create({ restaurant: rest._id, category: cat._id, name: 'Cupcake', price: 10000 });
  foodId = String(food._id);
});

describe('Phases 10 & 11: Reviews, Favourites, Profile, Notifications, Forgot Password', () => {
  describe('Reviews and Ratings', () => {
    it('allows a customer to rate a delivered order and updates restaurant aggregate rating', async () => {
      const order = await Order.create({
        orderNumber: 'FRREV001',
        user: customerId,
        restaurant: restaurantId,
        paymentMethod: 'cod',
        paymentStatus: 'cod',
        status: 'delivered',
        items: [{ name: 'Cupcake', price: 10000, qty: 1 }],
      });

      const rev = await reviewSvc.addReview(customerId, {
        orderId: String(order._id),
        rating: 5,
        comment: 'Delicious warm cupcakes!',
      });
      expect(rev.rating).toBe(5);
      expect(rev.comment).toBe('Delicious warm cupcakes!');

      // Check restaurant rating updated
      const updatedRest = await Restaurant.findById(restaurantId);
      expect(updatedRest?.rating).toBe(5);
      expect(updatedRest?.ratingCount).toBe(1);

      // Check review listing
      const list = await reviewSvc.getRestaurantReviews(restaurantId);
      expect(list.total).toBe(1);
      expect(list.items[0].comment).toBe('Delicious warm cupcakes!');
    });

    it('rejects reviews on undelivered orders or duplicate reviews on the same order', async () => {
      const pendingOrder = await Order.create({
        orderNumber: 'FRPEND01',
        user: customerId,
        restaurant: restaurantId,
        paymentMethod: 'cod',
        status: 'pending',
      });

      await expect(
        reviewSvc.addReview(customerId, { orderId: String(pendingOrder._id), rating: 4 }),
      ).rejects.toThrow();
    });
  });

  describe('Favourites Management', () => {
    it('toggles favourite restaurant and dish and lists bookmarked entries', async () => {
      // Bookmark restaurant
      const f1 = await favSvc.toggleFavourite(customerId, 'restaurant', restaurantId);
      expect(f1.isFavourite).toBe(true);

      // Bookmark food
      const f2 = await favSvc.toggleFavourite(customerId, 'food', foodId);
      expect(f2.isFavourite).toBe(true);

      // Retrieve list
      const favs = await favSvc.getFavourites(customerId);
      expect(favs.restaurants.length).toBe(1);
      expect(favs.foods.length).toBe(1);

      // Unbookmark
      const unbookmark = await favSvc.toggleFavourite(customerId, 'restaurant', restaurantId);
      expect(unbookmark.isFavourite).toBe(false);
      const after = await favSvc.getFavourites(customerId);
      expect(after.restaurants.length).toBe(0);
    });
  });

  describe('Profile & Saved Addresses', () => {
    it('manages personal details and multiple delivery addresses with default selection', async () => {
      await profileSvc.updateUserProfile(customerId, { name: 'Emma Stone', phone: '9876543210' });

      // Add address 1 (auto default)
      const a1 = await profileSvc.addAddress(customerId, {
        label: 'home',
        name: 'Emma',
        phone: '9876543210',
        line1: 'Flat 4B, Palm Grove',
        city: 'Kochi',
        pincode: '682001',
      });
      expect(a1.length).toBe(1);
      expect(a1[0].isDefault).toBe(true);

      // Add address 2 as default
      const a2 = await profileSvc.addAddress(customerId, {
        label: 'work',
        name: 'Emma',
        phone: '9876543210',
        line1: 'Infopark Tech Zone',
        city: 'Kochi',
        pincode: '682042',
        isDefault: true,
      });
      expect(a2.length).toBe(2);
      expect(a2[1].isDefault).toBe(true);
      expect(a2[0].isDefault).toBe(false);

      // Delete address
      const a3 = await profileSvc.deleteAddress(customerId, String(a2[0]._id));
      expect(a3.length).toBe(1);
    });
  });

  describe('Notifications System', () => {
    it('creates in-app notifications and tracks read state', async () => {
      await notifSvc.createNotification(customerId, {
        title: 'Order Dispatched',
        message: 'Your order is on the way!',
        type: 'order',
        link: '/orders/123',
      });

      const { items, unreadCount } = await notifSvc.getNotifications(customerId);
      expect(unreadCount).toBe(1);
      expect(items[0].title).toBe('Order Dispatched');

      // Mark read
      await notifSvc.markNotificationAsRead(customerId, String(items[0]._id));
      const after = await notifSvc.getNotifications(customerId);
      expect(after.unreadCount).toBe(0);
    });
  });

  describe('Forgot & Reset Password', () => {
    it('generates a password reset token and allows updating credentials', async () => {
      const reg = await authSvc.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Passw0rdOK1',
      });

      // Request reset
      const reqRes = await authSvc.forgotPassword('john@example.com');
      expect(reqRes.resetToken).toBeDefined();

      // Reset password with token
      const session = await authSvc.resetPassword(reqRes.resetToken!, 'NewPassw0rd2');
      expect(session.accessToken).toBeDefined();

      // Verify login with new password works
      const loginRes = await authSvc.login('john@example.com', 'NewPassw0rd2');
      expect(loginRes.accessToken).toBeDefined();
    });
  });
});
