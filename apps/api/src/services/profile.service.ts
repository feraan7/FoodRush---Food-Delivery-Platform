import { ISavedAddress, User } from '../models/User';
import { AppError } from '../utils/AppError';

export async function getUserProfile(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  return user;
}

export async function updateUserProfile(userId: string, data: { name?: string; phone?: string }) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  if (data.name) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone;

  await user.save();
  return user;
}

export async function addAddress(
  userId: string,
  data: {
    label?: 'home' | 'work' | 'other';
    name: string;
    phone: string;
    line1: string;
    city: string;
    pincode: string;
    isDefault?: boolean;
  },
) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  if (data.isDefault) {
    user.savedAddresses.forEach((a) => {
      a.isDefault = false;
    });
  } else if (user.savedAddresses.length === 0) {
    data.isDefault = true;
  }

  user.savedAddresses.push(data as ISavedAddress);
  await user.save();
  return user.savedAddresses;
}

export async function updateAddress(
  userId: string,
  addressId: string,
  data: {
    label?: 'home' | 'work' | 'other';
    name?: string;
    phone?: string;
    line1?: string;
    city?: string;
    pincode?: string;
    isDefault?: boolean;
  },
) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  const addr = (user.savedAddresses as any).id(addressId);
  if (!addr) throw new AppError(404, 'Address not found', 'NOT_FOUND');

  if (data.isDefault) {
    user.savedAddresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  if (data.label) addr.label = data.label;
  if (data.name) addr.name = data.name;
  if (data.phone) addr.phone = data.phone;
  if (data.line1) addr.line1 = data.line1;
  if (data.city) addr.city = data.city;
  if (data.pincode) addr.pincode = data.pincode;
  if (data.isDefault !== undefined) addr.isDefault = data.isDefault;

  await user.save();
  return user.savedAddresses;
}

export async function deleteAddress(userId: string, addressId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  const idx = user.savedAddresses.findIndex((a) => String(a._id) === addressId);
  if (idx === -1) throw new AppError(404, 'Address not found', 'NOT_FOUND');

  user.savedAddresses.splice(idx, 1);
  if (user.savedAddresses.length > 0 && !user.savedAddresses.some((a) => a.isDefault)) {
    user.savedAddresses[0].isDefault = true;
  }

  await user.save();
  return user.savedAddresses;
}
