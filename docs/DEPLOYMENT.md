# FoodRush Production & Deployment Guide

This document details how to deploy FoodRush in production using Docker Compose, container registries, or cloud platforms (e.g. AWS ECS, GCP Cloud Run, Render, Railway, Fly.io).

---

## 1. Environment Configuration

Create production `.env` files for the API service:

```bash
# apps/api/.env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/foodrush?retryWrites=true&w=majority

# Generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_ACCESS_SECRET=your_32_byte_access_secret_hex
JWT_REFRESH_SECRET=your_32_byte_refresh_secret_hex
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7

CLIENT_ORIGINS=https://app.foodrush.example.com,https://foodrush.example.com

# Payment Provider
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Optional: Cloudinary CDN for persistent media
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 2. Docker Deployment

### Single-Command Production Stack
The project includes a production multi-container setup in `docker-compose.yml`:

```bash
# Build and run the entire stack (MongoDB + API + Web Nginx)
docker compose up --build -d
```

- **Web Application**: Accessible at `http://localhost:80` (or your domain).
- **REST & Realtime API**: Handled through Nginx reverse proxying to `http://api:5000`.
- **Database**: Dedicated MongoDB instance with persistent volume `mongo-data`.

---

## 3. Cloud Provider Deployments

### A. Deploying Web to Static Hosts (Vercel, Netlify, Cloudflare Pages)
1. Build command: `npm run build -w apps/web`
2. Output directory: `apps/web/dist`
3. Environment variable: `VITE_API_URL=https://api.yourdomain.com`
4. Set up rewrite rule for SPA: `/* -> /index.html 200`

### B. Deploying API to Container Platforms (Railway, Render, Fly.io)
1. Select Dockerfile path: `apps/api/Dockerfile`
2. Bind port `5000` (or read `$PORT`)
3. Add MongoDB Atlas connection string and production secrets in dashboard environment settings.

---

## 4. Production Security & Health Checks

- **Health Probe**: `GET /api/v1/health` returns `{ "status": "ok" }` with 200 status.
- **Cookies**: The refresh cookie is set with `SameSite=Strict`, `httpOnly=true`, and `secure=true` (in production). Web and API must share the same second-level domain (e.g. `app.example.com` and `api.example.com`).
- **Rate Limiting**: Automatic global and auth-specific rate limiting via `express-rate-limit`.
- **Automatic Background Jobs**:
  - `cleanupStaleOrders`: Automatically sweeps every 60 seconds to release abandoned unpaid checkouts.
