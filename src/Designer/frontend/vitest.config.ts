import { defineConfig, mergeConfig } from 'vitest/config';
import common from './vite.config';
import vitestMigratedDirectories from './vitest.migrated';

export default mergeConfig(
  common,
  defineConfig({
    test: {
      include: vitestMigratedDirectories.map((directory) => `${directory}/**/*.test.{ts,tsx}`),
      // Shared test helpers call the global expect. They cannot import it from vitest while Jest also loads them.
      globals: true,
      // Tests assert on the plain class names of CSS modules, which identity-obj-proxy gave them in Jest.
      css: { modules: { classNameStrategy: 'non-scoped' } },
      environment: 'jsdom',
      // Tests expect URLs on http://localhost/, the Jest default. Vitest defaults to http://localhost:3000.
      environmentOptions: { jsdom: { url: 'http://localhost/' } },
      setupFiles: ['./testing/setupTests.vitest.ts'],
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
        // While both runners run, keep this report apart from Jest's in coverage/, and limit it to the migrated
        // directories so the two reports cover separate files. Remove both settings together with Jest.
        reportsDirectory: 'coverage/vitest',
        include: vitestMigratedDirectories.map((directory) => `${directory}/**/*.{ts,tsx}`),
        exclude: ['**/vite.config.ts'],
      },
    },
  }),
);
