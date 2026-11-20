import { defineConfig, mergeConfig } from 'vitest/config';
import common from './vite.config';

export default mergeConfig(
  common,
  defineConfig({
    test: {
      include: ['**/*.test.{ts,tsx}'],
      // React Testing Library only cleans up after each test when afterEach is global.
      globals: true,
      // Clears the calls of every mock before each test. This is Vitest's default, set here for clarity.
      clearMocks: true,
      // Tests assert on the plain class names of CSS modules.
      css: { modules: { classNameStrategy: 'non-scoped' } },
      environment: 'jsdom',
      // Tests expect URLs on http://localhost/. Vitest defaults to http://localhost:3000.
      environmentOptions: { jsdom: { url: 'http://localhost/' } },
      setupFiles: ['./testing/setupTests.ts'],
      // html-react-parser loads a CommonJS build that requires domhandler, which is an ES module only. Node 22, which CI
      // uses, cannot do that in VM threads. Bundling html-react-parser first avoids it, as in the App frontend.
      deps: { optimizer: { client: { enabled: true, include: ['html-react-parser'] } } },
      // Creating jsdom dominates the run time. VM threads create it once per worker and still isolate each test
      // file. A worker is restarted when it reaches the memory limit, since VM contexts keep growing.
      pool: 'vmThreads',
      // With coverage on, collecting each file's coverage gets slower the longer a worker lives, so a low limit that
      // restarts workers more often makes the CI run faster.
      vmMemoryLimit: '1GB',
      // CI runs tests several times slower than a developer machine, and some tests are slow in jsdom 30 because the
      // design system's web components query and compute styles on every DOM change. A test that takes 3 s locally
      // can take more than 20 s in CI.
      testTimeout: 60000,
      coverage: {
        // Codecov and Sonar read lcov.info, see sonar-project.properties.
        reporter: ['lcov'],
        // Test helpers are not product code, so they do not count towards coverage.
        exclude: ['testing/**', '**/src/testing/**'],
      },
    },
  }),
);
