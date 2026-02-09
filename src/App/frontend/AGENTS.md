# CLAUDE.md

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

This is the Altinn 3 app frontend - a React application that renders dynamic forms and layouts for Norwegian government services. The app is built to work with the Altinn Studio platform and communicates with .NET app backends.

## Development Commands

### Core Commands

- `yarn start` - Start development server (runs codegen first)
- `yarn build` - Production build (runs codegen and copy-schemas)
- `yarn gen` - Run code generation for schemas
- `yarn copy-schemas` - Copy JSON schemas to dist

### Testing

- `yarn test` - Run Jest unit tests (runs codegen first)
- `yarn test:watch` - Run tests in watch mode
- `yarn test:watchall` - Run all tests in watch mode
- `yarn cy:open` - Open Cypress for e2e testing
- `yarn cy:run` - Run Cypress tests headlessly

### Code Quality

- `yarn lint` - Run ESLint (runs codegen first)
- `yarn tsc` - Run TypeScript compiler check
- `yarn tsc:watch` - Run TypeScript in watch mode

### Single Test Execution

To run files that partly matches path: `yarn test -- partlyMatchingPathOrFilename`

## Architecture Overview

### State Management Strategy

The codebase uses a hybrid approach with plans to modernize:

**Current State (Legacy)**:

- Multiple nested React Contexts creating
- A Node Hierarchy in NodesContext that keeps state for all components/nodes
- Zustand stores wrapping data in custom context providers to avoid rerenders
- Tight coupling between contexts and components

**Desired Future State**:

- React Query for server state management
- Reduced dependency on React Context
- Zustand potentially replaced by React Query patterns
- Migration from Webpack to Vite, Jest to Vitest, Cypress to Playwright
- Migration to wrap Designsystemet component and our own smaller components that Designsystemet doesn't have in our own dumb components in `src/app-components/`.

### Key Architectural Patterns

#### Context System

- Custom context creation utility in `src/core/contexts/context.tsx`
- Zustand context wrapper in `src/core/contexts/zustandContext.tsx`
- Many feature-specific providers in `src/features/*/Provider.tsx`

#### Component Architecture

- Layout components in `src/layout/` with generated config files
- App-level components in `src/app-components/`
- Shared components in `src/components/`
- Each layout component has: `Component.tsx`, `config.ts`, `index.tsx`

#### Code Generation

- Extensive use of TypeScript code generation from JSON schemas
- Generated files have `.generated.ts` suffix
- Run `yarn gen` before most operations

### Directory Structure

#### Core Directories

- `src/core/` - Core utilities, contexts, and base functionality
- `src/features/` - Feature-specific code organized by domain
- `src/layout/` - Layout components that render form elements
- `src/app-components/` - Reusable UI components
- `src/utils/` - Utility functions and helpers
- `adr/` - Architecture Decision Records

#### Key Features

- `src/features/formData/` - Form data management and validation
- `src/features/layout/` - Layout rendering and structure
- `src/features/language/` - Internationalization and text resources
- `src/features/validation/` - Form validation logic
- `src/features/attachments/` - File upload and attachment handling

### Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build**: Webpack (migrating to Vite)
- **Testing**: Jest + React Testing Library (migrating to Vitest), Cypress (migrating to Playwright)
- **State**: React Context + Zustand (evolving to React Query focus)
- **Styling**: CSS Modules + Digdir Design System
- **Package Manager**: Yarn 4 with Corepack

### Important Development Notes

#### Code Generation Dependency

Most commands automatically run `yarn gen` first. The codegen system generates TypeScript definitions from JSON schemas, which are essential for the app to function.

#### Context Provider Hierarchy

The app has a complex provider tree with many nested contexts. When making changes, be aware of:

- Provider order dependencies
- Context value propagation
- Performance implications of context changes

#### TypeScript best practices

There are many usages of `any` or type casting (`as type`) in the codebase. This skips TypeScript completely and is, in most cases, not what we want. We would like to improve the typing by avoiding this moving forward whilst also refactoring and improving existing types by removing such casts and `any`s.

#### TanStack Query best practices

Use objects for managing query keys and functions and `queryOptions` for sharing these across the system and central management.
Please see [TkDodo's blog](https://tkdodo.eu/blog/all) for more best practices, insights and tips and tricks.

#### Component Configuration

Layout components use a standardized structure:

- `config.ts` - Component configuration and props
- `Component.tsx` - Main component implementation
- `index.tsx` - Export and registration
- `config.generated.ts` - Generated type definitions

#### Testing Considerations

- Most tests require form layout context to be provided
- Use `renderWithProviders` from `src/test/renderWithProviders.tsx`
- Mock external dependencies in `src/__mocks__/`

### Common Patterns

#### Adding New Layout Components

1. Create directory in `src/layout/NewComponent/`
2. Add `config.ts`, `Component.tsx`, `index.tsx`
3. Register component in layout system
4. Run `yarn gen` to update generated files

#### Styling

- Use CSS Modules for component styling
- Follow existing patterns in `*.module.css` files
- Leverage Digdir Design System components when possible
