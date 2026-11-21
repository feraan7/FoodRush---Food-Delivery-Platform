import { createServer } from 'http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { env } from './config/env';
import { cleanupStaleOrders } from './services/admin.service';
import { initSockets } from './sockets';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const server = createServer(createApp());
  initSockets(server);

  // Background worker: clean up stale unpaid orders every 60 seconds
  const staleCleanupInterval = setInterval(() => {
    cleanupStaleOrders().catch((err) => console.error('Stale cleanup error:', err));
  }, 60_000);

  server.listen(env.PORT, () => console.log(`FoodRush API listening on :${env.PORT}`));
  const shutdown = () => {
    clearInterval(staleCleanupInterval);
    server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
