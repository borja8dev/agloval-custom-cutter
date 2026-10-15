import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    // Override with CYPRESS_BASE_URL when the dev server does not run on port 3000.
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    video: false,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 1,
      openMode: 0,
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
})
