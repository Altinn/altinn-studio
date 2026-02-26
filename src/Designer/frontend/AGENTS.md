# AGENTS.md

This file provides guidance to AI agents when working with code.

## Frontend Stack

Studio Designer's frontend relies on the following tools:

- Yarn
- Vite
- TypeScript
- ESLint
- React
- React Router
- Tanstack Query
- Jest with React Testing Library for unit tests
- Playwright for E2E tests
- React components and CSS tokens from Designsystemet

## Project Structure

The frontend consists of several React packages in the following directories:

- `./admin` - Overview of a user's apps. This is a work in progress and is not available to users yet.
- `./app-development` - Routes, contexts, hooks, utility functions and types that are common to the packages in the `./packages` directory.
- `./app-preview` - Displays a preview of the app.
- `./dashboard` - Overview of apps and resources.
- `./language` - Contains language-related utilities, most notably the `nb.json` file, where all text resources for the app should be kept. There is also an English version of the file, but language support for English is not yet available in the project, and the `en.json` file is not maintained.
- `./libs` - Contains independent libraries that are used in the project.
  - `studio-components` - React component facade wrapping `digdir/designsystemet-react` to isolate the application from external design system changes. Also includes custom components.
  - `studio-components-legacy` - Legacy React components that should eventually be transferred to the directory above.
  - `studio-content-library` - A content library that is used by organisations in the `./dashboard` package, and by individual apps in the `./app-development` package.
  - `studio-feedback-form` - A feedback form library used for getting user feedback.
  - `studio-hooks` - A collection of React hooks.
  - `studio-icons` - A collection of SVG icons exported as React elements.
  - `studio-pure-functions` - A collection of general utility classes for handling arrays, blobs, dates, files, numbers, strings, etc. Use these utilities to avoid code duplication for common operations.
- `./packages` - Contains tools for individual Altinn apps.
  - `policy-editor` - Handles access policy.
  - `process-editor` - Handles the BPMN process.
  - `schema-editor` - Handles editing data models.
  - `schema-model` - Underlying model for the `schema-editor` package.
  - `shared` - Shared resources for the `./packages` directory.
  - `text-editor` - Handles editing of texts and their translations.
  - `ux-editor` - Layout and form component configurations.
  - `ux-editor-v3` - Legacy package, not maintained.
- `./resourceadm` - Altinn resource register.
- `./scripts` - Independent scripts for configuration of form components.
- `./studio-root` - The root of the frontend.
- `./testing` - Contains E2E tests and general test utilities.

## Development Commands

### Build

- `yarn build` - Production build

### Test

- `yarn test` - Run Jest unit tests. To filter which tests to run, use: `yarn test partlyMatchingPathOrFilename`

### Development servers

- `yarn start-admin` - Runs the app administration package
- `yarn start-app-development` - Runs the app development package
- `yarn start-app-preview` - Runs the app preview package
- `yarn start-dashboard` - Runs the app dashboard package
- `yarn start-studio-root` - Runs the studio root package
- `yarn start-resourceadm` - Runs the resource admin package

### Code quality

- `yarn lint` - Run ESLint
- `yarn typecheck` - Run TypeScript compiler check

## API Integration

**File Structure:**

- `./packages/shared/src/api/paths.js` - Backend URL path definitions
- `./packages/shared/src/utils/networking.ts` - Wrappers for Axios HTTP methods
- `./packages/shared/src/api/queries.ts` - Combines HTTP wrappers and paths into queries
- `./packages/shared/src/types/QueryKey.ts` - Tanstack Query keys

**Architecture:**

1. Path definitions → Query functions → Custom hooks → Components
2. Query functions wrap paths with HTTP methods (get, post, put, patch, delete)
3. Each query function has a corresponding React hook using `useQuery` or `useMutation`
4. Data is cached using Tanstack Query keys

- Use tuple-style keys: `['entity', org, app, id]`
- Avoid `invalidateQueries()` without a key

Components MUST use custom hooks, never call `useQuery`/`useMutation` directly.

## Unit tests

- Unit tests should be placed in the same folder as the component it is testing.
- Tanstack Query tests: Prefer `queryClient.setQueryData` to seed data for hooks/components.
- The `render` function from `@testing-library/react` should not be used directly in test cases. Instead, create a helper function `render{componentName}`, which takes `props` as an argument, at the bottom of the test file.
- For components with required props, create a `defaultProps` object with minimal valid values.
- Create helper functions like `getFirstEditButton` to make test cases easy to read.
- Prefer semantic role queries like `screen.getByRole('button', { name: text })` over `screen.getByText(text)` or `screen.getByTitle(text)`.

## Imports

- Use ES modules (import/export) syntax, not CommonJS (require).
- Prefix type imports with `type`.
- Do not import components directly from `digdir/designsystemet-react`. Always import via `libs/studio-components`. If a component is missing, add a wrapper in `studio-components`.
