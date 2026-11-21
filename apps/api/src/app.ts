import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimit';
import { sanitize } from './middleware/sanitize';

import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import catalogRoutes from './routes/catalog.routes';
import commerceRoutes from './routes/commerce.routes';
import deliveryRoutes from './routes/delivery.routes';
import favouriteRoutes from './routes/favourite.routes';
import notificationRoutes from './routes/notification.routes';
import profileRoutes from './routes/profile.routes';
import restaurantRoutes from './routes/restaurant.routes';
import reviewRoutes from './routes/review.routes';
import uploadRoutes from './routes/upload.routes';

export function createApp() {
  const app = express();
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || env.origins.includes(origin)), credentials: true }));
  app.use(globalLimiter);
  app.use(express.json({ limit: '10mb' })); // Allows base64 image uploads
  app.use(cookieParser());
  app.use(sanitize);

  // Static uploads directory for local fallback image storage
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Static images directory (serves food photos from web public directory)
  const imagesDir = path.resolve(process.cwd(), 'apps/web/public/images');
  const fallbackImagesDir = path.resolve(__dirname, '../../web/public/images');
  app.use('/images', express.static(imagesDir));
  app.use('/images', express.static(fallbackImagesDir));

  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1', catalogRoutes);
  app.use('/api/v1', commerceRoutes);
  app.use('/api/v1', uploadRoutes);
  app.use('/api/v1', reviewRoutes);
  app.use('/api/v1/restaurant', restaurantRoutes);
  app.use('/api/v1/delivery', deliveryRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/profile', profileRoutes);
  app.use('/api/v1/favourites', favouriteRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
