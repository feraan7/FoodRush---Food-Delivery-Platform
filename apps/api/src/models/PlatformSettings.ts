import { Schema, model } from 'mongoose';
import { PRICING } from '../config/pricing';

export interface IPlatformSettings {
  deliveryFee: number; // paise
  freeDeliveryThreshold: number; // paise
  taxRatePercent: number; // e.g. 5
  commissionRatePercent: number; // e.g. 15
  deliveryPartnerBaseFee: number; // paise e.g. 3500
  isMaintenanceMode: boolean;
}

const platformSettingsSchema = new Schema<IPlatformSettings>(
  {
    deliveryFee: { type: Number, default: PRICING.DELIVERY_FEE },
    freeDeliveryThreshold: { type: Number, default: PRICING.FREE_DELIVERY_THRESHOLD },
    taxRatePercent: { type: Number, default: 5 },
    commissionRatePercent: { type: Number, default: 15 },
    deliveryPartnerBaseFee: { type: Number, default: 3500 },
    isMaintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const PlatformSettings = model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);

export async function getPlatformSettings(): Promise<IPlatformSettings> {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({
        deliveryFee: PRICING.DELIVERY_FEE,
        freeDeliveryThreshold: PRICING.FREE_DELIVERY_THRESHOLD,
        taxRatePercent: 5,
        commissionRatePercent: 15,
        deliveryPartnerBaseFee: 3500,
        isMaintenanceMode: false,
      });
    }
    return settings;
  } catch {
    return {
      deliveryFee: PRICING.DELIVERY_FEE,
      freeDeliveryThreshold: PRICING.FREE_DELIVERY_THRESHOLD,
      taxRatePercent: 5,
      commissionRatePercent: 15,
      deliveryPartnerBaseFee: 3500,
      isMaintenanceMode: false,
    };
  }
}
