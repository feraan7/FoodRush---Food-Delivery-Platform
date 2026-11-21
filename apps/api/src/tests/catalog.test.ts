import { describe, expect, it } from 'vitest';
import { foodQuery, restaurantQuery, searchQuery } from '../validators/catalog.validators';

describe('catalog query validation', () => {
  it('applies defaults and coerces numbers/booleans', () => {
    const q = restaurantQuery.parse({ veg: 'true', page: '2' });
    expect(q).toMatchObject({ veg: true, page: 2, limit: 12, sort: 'rating' });
  });
  it('rejects bad sort values, oversized limits and array injection', () => {
    expect(restaurantQuery.safeParse({ sort: 'name' }).success).toBe(false);
    expect(restaurantQuery.safeParse({ limit: '500' }).success).toBe(false);
    expect(foodQuery.safeParse({ q: ['a', 'b'] }).success).toBe(false);
  });
  it('requires at least 2 characters for search', () => {
    expect(searchQuery.safeParse({ q: 'a' }).success).toBe(false);
    expect(searchQuery.safeParse({ q: 'bi' }).success).toBe(true);
  });
});
