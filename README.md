# FoodRush — Full-Stack Food Delivery Platform

Production-ready, hyper-local food ordering and delivery monorepo spanning customer ordering, restaurant kitchen dashboard, delivery partner fleet dispatch, and admin operations.

---

## Phases Overview

- **Phases 0–1**: Monorepo foundation, secure token authentication, refresh cookie rotation, rate limiting.
- **Phases 2–4**: Catalog search & filtering, persistent cart with server-side pricing, coupon discounts.
- **Phases 5–6**: Payments (Mock & Razorpay signature verification), idempotent order creation, live Socket.IO tracking.
- **Phase 7**: Restaurant Dashboard — menu management (CRUD, Cloudinary image uploads, stock availability toggles), order acceptance & kitchen prep workflow, sales analytics & top dishes.
- **Phase 8**: Delivery Fleet — partner onboarding & vehicle registration, duty online/offline toggle, pool of ready-for-pickup orders, pickup/delivery status updates, payout tracking.
- **Phase 9**: Admin Panel — restaurant approvals/suspensions, delivery partner verification, promo coupon management, platform pricing & commission settings, manual refund processing, and stale order cleanup.
- **Phases 10–11**: Customer Enhancements & Production Readiness — reviews & ratings, favourites bookmarking, customer profile & saved address book, real-time in-app notifications, password recovery (forgot/reset), full documentation, integration tests, and containerised deployment.

### Open Edge Cases Handled
1. **Stale Unpaid Orders Cleanup**: Background scheduler automatically sweeps online orders left unpaid after 15 minutes, transitioning them to `cancelled` and restoring coupon allowances.
2. **Refund Processing**: Cancelled paid orders (`refund_pending`) can be processed directly by administrators in the Admin Panel with audit logs and push notifications.

---

## Architecture & Documentation

- [System Architecture & State Machine](file:///c:/Users/HP/Desktop/project/foodrush-phase1/docs/ARCHITECTURE.md)
- [Comprehensive REST & WebSocket API Reference](file:///c:/Users/HP/Desktop/project/foodrush-phase1/docs/API_REFERENCE.md)
- [Production Deployment & Docker Guide](file:///c:/Users/HP/Desktop/project/foodrush-phase1/docs/DEPLOYMENT.md)

---

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
# Update MONGODB_URI and JWT secrets in apps/api/.env

# 3. Seed demo catalog and coupons
npm run seed -w apps/api

# 4. Start local development servers
npm run dev:api    # REST & WebSocket API (http://localhost:5000)
npm run dev:web    # React 19 Frontend (http://localhost:5173)
```

---

## Verification & Testing

```bash
# Typecheck across the entire monorepo
npm run typecheck

# Production build bundle
npm run build

# Run Vitest test suites
npm test
```
