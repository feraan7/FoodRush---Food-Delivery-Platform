import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 600000,
    include: ['src/tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/unused',
      JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-0001',
      JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret-02',
    },
  },
});
