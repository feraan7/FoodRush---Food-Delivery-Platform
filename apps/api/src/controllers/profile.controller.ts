import { z } from 'zod';
import * as svc from '../services/profile.service';
import { asyncHandler } from '../utils/asyncHandler';

const uid = (req: any) => req.user!.id as string;

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional(),
  })
  .strict();

export const addressSchema = z
  .object({
    label: z.enum(['home', 'work', 'other']).optional(),
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    line1: z.string().trim().min(5).max(200),
    city: z.string().trim().min(2).max(60),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const updateAddressSchema = addressSchema.partial();

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: await svc.getUserProfile(uid(req)) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  res.json({ user: await svc.updateUserProfile(uid(req), req.body) });
});

export const addAddress = asyncHandler(async (req, res) => {
  res.status(201).json({ addresses: await svc.addAddress(uid(req), req.body) });
});

export const updateAddress = asyncHandler(async (req, res) => {
  res.json({ addresses: await svc.updateAddress(uid(req), req.params.id, req.body) });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  res.json({ addresses: await svc.deleteAddress(uid(req), req.params.id) });
});
