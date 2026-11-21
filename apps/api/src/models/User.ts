import { Schema, model, Types } from 'mongoose';
import { ROLES, Role } from '../types';

export interface Session {
  tokenHash: string;
  expiresAt: Date;
}

export interface ISavedAddress {
  _id?: Types.ObjectId;
  label: 'home' | 'work' | 'other';
  name: string;
  phone: string;
  line1: string;
  city: string;
  pincode: string;
  isDefault?: boolean;
}

export interface IDeliveryProfile {
  vehicleType?: 'bike' | 'scooter' | 'cycle' | 'ev';
  vehicleNumber?: string;
  isAvailable: boolean;
  status: 'pending' | 'approved' | 'rejected';
  totalEarnings: number; // paise
}

export interface IUser {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  failedLogins: number;
  lockUntil?: Date;
  sessions: Session[];
  savedAddresses: ISavedAddress[];
  deliveryProfile?: IDeliveryProfile;
  favourites: {
    restaurants: Types.ObjectId[];
    foods: Types.ObjectId[];
  };
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

const sessionSchema = new Schema<Session>({ tokenHash: String, expiresAt: Date }, { _id: false });

const savedAddressSchema = new Schema<ISavedAddress>({
  label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
});

const deliveryProfileSchema = new Schema<IDeliveryProfile>(
  {
    vehicleType: { type: String, enum: ['bike', 'scooter', 'cycle', 'ev'], default: 'bike' },
    vehicleNumber: { type: String, trim: true },
    isAvailable: { type: Boolean, default: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    totalEarnings: { type: Number, default: 0 },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'customer', index: true },
    isActive: { type: Boolean, default: true },
    failedLogins: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    sessions: { type: [sessionSchema], default: [], select: false },
    savedAddresses: { type: [savedAddressSchema], default: [] },
    deliveryProfile: { type: deliveryProfileSchema },
    favourites: {
      restaurants: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
      foods: [{ type: Schema.Types.ObjectId, ref: 'Food' }],
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        for (const k of ['passwordHash', 'sessions', 'failedLogins', 'lockUntil', 'resetPasswordToken', 'resetPasswordExpires', '__v']) delete ret[k];
        return ret;
      },
    },
  },
);

export const User = model<IUser>('User', userSchema);
