export const ROLES = ['customer', 'restaurant', 'delivery', 'admin'] as const;
export type Role = (typeof ROLES)[number];

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}
