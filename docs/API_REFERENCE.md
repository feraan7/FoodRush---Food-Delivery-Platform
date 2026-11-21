# FoodRush API Reference

All requests and responses use JSON. Prices and monetary values are integer amounts in paise (₹1 = 100 paise).
Authenticated endpoints require a Bearer token in the `Authorization` header (`Authorization: Bearer <accessToken>`).

---

## 1. Authentication (`/api/v1/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register customer account (`name`, `email`, `phone`, `password`) |
| `POST` | `/login` | Public | Log in; returns access token & sets `fr_refresh` httpOnly cookie |
| `POST` | `/refresh` | Cookie | Rotates refresh token & issues new access token |
| `POST` | `/logout` | Optional | Revokes refresh token session |
| `GET` | `/me` | Bearer | Get current authenticated user profile |
| `POST` | `/forgot-password` | Public | Request password reset token (`email`) |
| `POST` | `/reset-password` | Public | Reset password with token (`token`, `password`) |

---

## 2. Public Catalog (`/api/v1`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/categories` | Public | List all food categories |
| `GET` | `/restaurants` | Public | Filter restaurants (`q`, `cuisine`, `veg`, `open`, `sort`, `page`, `limit`) |
| `GET` | `/restaurants/:slug` | Public | Restaurant details + categorised menu |
| `GET` | `/foods` | Public | Filter food items |
| `GET` | `/search?q=` | Public | Search restaurants and dishes |

---

## 3. Cart & Orders (`/api/v1`)

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/cart?coupon=CODE` | customer | Get current cart with computed totals |
| `POST` | `/cart/items` | customer | Add dish (`foodId`, `qty`, `replace?`) |
| `PATCH` | `/cart/items/:foodId`| customer | Update quantity (0 deletes) |
| `DELETE`| `/cart` | customer | Clear entire cart |
| `POST` | `/orders` | customer | Place order with `Idempotency-Key` header |
| `GET` | `/orders` | customer | List personal orders |
| `GET` | `/orders/:id` | involved | Order details & tracking status |
| `PATCH` | `/orders/:id/status` | involved | Advance order state per state machine |
| `POST` | `/orders/:id/payment/verify` | customer | Verify online gateway payment signature |
| `POST` | `/orders/:id/payment/mock-pay` | customer | Dev mock payment generator |

---

## 4. Restaurant Partner API (`/api/v1/restaurant`)

*Requires `restaurant` or `admin` role.*

| Method | Path | Description |
|---|---|---|
| `GET` | `/profile` | Get owner's restaurant details |
| `PATCH` | `/profile` | Update restaurant settings (`name`, `isOpen`, `deliveryMins`, `image`, etc.) |
| `GET` | `/menu` | List menu dishes for owner's restaurant |
| `POST` | `/menu` | Add new food dish (`name`, `price`, `category`, `image`, `isVeg`, etc.) |
| `PATCH` | `/menu/:id` | Update food dish |
| `PATCH` | `/menu/:id/toggle` | Instant availability toggle (in-stock / out-of-stock) |
| `DELETE`| `/menu/:id` | Delete food dish |
| `GET` | `/orders?status=` | List restaurant orders with status filters |
| `PATCH` | `/orders/:id/status` | Accept (`confirmed`), prepare (`preparing`), ready (`ready_for_pickup`) |
| `GET` | `/analytics` | Gross revenue, order counts, 7-day sales trend, top 5 dishes |

---

## 5. Delivery Partner API (`/api/v1/delivery`)

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/register` | logged-in | Register as delivery partner (`vehicleType`, `vehicleNumber`) |
| `GET` | `/profile` | delivery | Get fleet partner duty status and stats |
| `PATCH` | `/duty` | delivery | Toggle duty `isAvailable` (Online / Offline) |
| `GET` | `/orders/available` | delivery | Orders in `ready_for_pickup` awaiting assignment |
| `POST` | `/orders/:id/accept` | delivery | Accept order assignment |
| `GET` | `/orders/active` | delivery | List currently assigned active orders |
| `PATCH` | `/orders/:id/status` | delivery | Update delivery (`picked_up`, `out_for_delivery`, `delivered`) |
| `GET` | `/earnings` | delivery | Earnings breakdown, daily revenue and trip count |

---

## 6. Admin Panel API (`/api/v1/admin`)

*Requires `admin` role.*

| Method | Path | Description |
|---|---|---|
| `GET` | `/stats` | Platform KPIs: gross sales, commissions, customer & partner counts |
| `GET` | `/restaurants?status=` | List all platform restaurants |
| `PATCH` | `/restaurants/:id/status` | Approve, reject, or suspend restaurant |
| `GET` | `/delivery-partners` | List all registered delivery partners |
| `PATCH` | `/delivery-partners/:id/status` | Approve or suspend delivery partner |
| `GET` | `/coupons` | List all promotional coupons |
| `POST` | `/coupons` | Create coupon (`code`, `type`, `value`, `minOrder`, `maxDiscount`) |
| `PATCH` | `/coupons/:id` | Update or enable/disable coupon |
| `DELETE`| `/coupons/:id` | Delete coupon |
| `GET` | `/orders?status=&page=` | Full platform order logs |
| `POST` | `/orders/:id/refund` | **Process manual refund** for `refund_pending` orders |
| `POST` | `/orders/cleanup-stale` | **Trigger cleanup of stale unpaid orders** |
| `GET` | `/settings` | Get dynamic pricing & commission settings |
| `PATCH` | `/settings` | Update platform settings (`deliveryFee`, `taxRatePercent`, etc.) |

---

## 7. Customer Features (`/api/v1`)

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/reviews` | customer | Leave review for delivered order (`orderId`, `rating`, `comment`) |
| `GET` | `/restaurants/:id/reviews` | Public | List reviews and ratings for a restaurant |
| `GET` | `/favourites` | customer | Get bookmarked restaurants and dishes |
| `POST` | `/favourites/toggle` | customer | Toggle favourite (`type: 'restaurant' \| 'food'`, `id`) |
| `GET` | `/profile` | customer | Profile info and saved address book |
| `PATCH` | `/profile` | customer | Update name and phone |
| `POST` | `/profile/addresses` | customer | Add delivery address (`label`, `line1`, `city`, `pincode`, `isDefault`) |
| `PATCH` | `/profile/addresses/:id` | customer | Update saved address or set as default |
| `DELETE`| `/profile/addresses/:id` | customer | Delete saved address |
| `GET` | `/notifications` | customer | In-app notifications & unread count |
| `PATCH` | `/notifications/:id/read` | customer | Mark notification as read |
| `PATCH` | `/notifications/read-all` | customer | Mark all notifications read |
| `POST` | `/upload` | authenticated | Upload image (`image: <base64>`) -> Cloudinary / local URL |

---

## 8. Realtime WebSockets (Socket.IO)

- **Authentication**: `{ auth: { token: <accessToken> } }`
- **Client Emits**:
  - `order:join` (`orderId`, callback: (allowed: boolean) => void)
- **Server Broadcasts**:
  - `order:updated`: Emitted when order status, payment status, or audit history changes.
  - `notification:new`: Emitted to `user:<userId>` room when new push notifications arrive.
