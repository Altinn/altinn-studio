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



### E2E tests

The existing Cypress test suite in `test/e2e/` is the **source of truth** for validating the migration. The `nextsrc/` code must pass all existing Cypress tests before it can replace `src/`. These tests cover:

- **93 integration spec files** across 12 test feature areas (+ 1 manual spec)
- **42 frontend-test specs**: full workflows (instantiation, navigation, auto-save, validation, groups, attachments, PDF, process steps, receipt, language, options, dynamics, formatting, party-selection, etc.)
- **25 component-library specs**: individual component behavior (input, dropdown, checkboxes, radio buttons, date picker, address, file upload, image upload, grid, list, repeating group, person/org lookup, etc.)
- **5 stateless app specs**: stateless forms, receipts, party selection, feedback, instantiate-from-query-params
- **4 subform specs**: subform containers, attachments in subforms, PDF with subforms, table edit button
- **4 multiple-datamodels specs**: fetching, saving, readonly, validation across data models
- **4 anonymous stateless specs**: anonymous access, auto-save, options, validation
- **2 expression-validation specs**: dynamic validation expressions
- **2 signing specs**: multi-signer workflows, rejection
- **1 payment spec**, **1 service-task spec**, **1 navigation-subform spec**, **1 user-managed signing spec**

### Running Cypress tests

**Prerequisites**: Local docker environment must be running (`local.altinn.cloud` accessible).

```bash
# Run a single spec headlessly
npx cypress run --env environment=docker --spec "test/e2e/integration/component-library/input.ts" --headless --browser chrome

# Run all component-library specs headlessly
npx cypress run --env environment=docker --spec "test/e2e/integration/component-library/**/*.ts" --headless --browser chrome

# Run a specific feature test
npx cypress run --env environment=docker --spec "test/e2e/integration/frontend-test/validation.ts" --headless --browser chrome

# Run all tests headlessly
npx cypress run --env environment=docker --headless --browser chrome

# Open Cypress interactively (for debugging)
npx cypress open --env environment=docker
```

## Verifying code

Always run both of these commands to verify changes:

```bash
npx tsc --noEmit   # Type checking
yarn lint --fix    # Linting (eslint + prettier)
```

Run these every time before considering a change complete or ready to commit.

# Here is an overview of the rules we follow in the frontend code.

# Typescript
## Code rules
- Functions must always have a return type.
- A module should not export other functions than those used outside the module. The exception is when we want to have a direct unit test for something.
- Functions used internally by another function should be located in the same folder as the function they are used in.
- Object types that are subject to many operations should be defined as classes. Related functions should be grouped within this class instead of being defined in a separate `utils` file.
- Ternary expressions must not be nested. Instead, use `else if` (or `switch` if applicable) or split the expression into multiple functions. All forms of nested expressions violate the principle of having only one level of abstraction.

## Naming conventions
- Files and folders exporting a single item must have the same name as the item they export. For example, a file exporting only the type `ExampleType` should be named `ExampleType.ts`. The exception is when it is designed to export multiple items in the same category. For example, a file may be named `constants.ts` even if it only exports one constant.
- Files and folders exporting multiple items should use "kebab case". This means words are separated by hyphens. For example, `dom-utils` for a folder exporting several functions related to the DOM model.
- The suffix `utils` should be used for files and classes that group functions for a given data type or component.
- Types used in network requests should have one of the suffixes `Payload`, `Response`, or `Params`, depending on the role of the type.
- Lists should be named either in the plural form of the entity being listed (e.g., `options`) or with a suffix like `List` or `Group` (e.g., `optionList`).

## Unit tests
We use [Jest](https://jestjs.io/) as the testing framework for TypeScript.

### Use of `describe` blocks
Unit tests for a given function should be grouped in a `describe` block named after the function. We also group all tests in the same file into one large `describe` block, as some code tools (e.g., WebStorm) provide utilities that make it easy to trigger all tests in one such block vg .

Example:
```typescript
describe('filename', () => {
  describe('function1', () => {
    it('Returns true when given a string', () => {
      const result = function1('test');
      expect(result).toBe(true);
    });

    it('Returns false when given a number', () => {
      const result = function1(12);
      expect(result).toBe(false);
    });
  });

  describe('function2', () => {
    it('Returns the given string backwards', () => {
      const result = function2('abc');
      expect(result).toBe('cba');
    });
  });
});
```

### `it` or `test`?
The `it` and `test` functions are equivalent. Use `it` when, combined with the first parameter, it reads as a sentence, as in the examples above. In all other cases, use `test`.

## Enum vs. union type
Sometimes we need to choose between using an `enum` or a type that simply specifies the valid values for a variable.

Example of an enum:
```typescript
enum Size {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}
```

The same values as a union type:
```typescript
type Size = 'small' | 'medium' | 'large';
```

The advantage of an enum is that it is easy to locate where it is used and, since it is available in runtime, it is possible to iterate over the values. However, it requires more code to define and must always be imported when used. Therefore, we follow this rule:

_Use an enum in cases where we need to iterate over the valid values at least once in the code. In all other cases, use union types._

# React
## Separate presentation and data processing
React components should only contain code related to the presentation of data. Data processing should be defined in separate files that are not dependent on the React framework. This means a React component should not have any knowledge of the structure of the data it processes. All data extraction and modification should be handled by functions defined outside the component code.

This principle makes it easy to test the data processing, since the tests don't need to take the complexity of React and DOM concepts into account. They only need to focus on input and output values. On the other side, the React component tests must cover presentation and user interactions, but they con't need to care about the details of the data.

### Example
The following example presents two text fields that accept an integer number and the sum of these two numbers. The sum is calculated using a function named `add`, which is defined outside of the component code and has its own unit tests. This function takes care of all the data processing: It converts the two terms from strings to numbers, adds them together and parses the result back to a string. Thus, the component code only contains state and event handling and the presentation JSX.
```typescript
function App(): React.ReactNode {
  const [firstTerm, setFirstTerm] = React.useState<string>('0');
  const [secondTerm, setSecondTerm] = React.useState<string>('0');

  const sum = React.useMemo<string>(
    () => add(firstTerm, secondTerm), // This is where the magic happens
    [firstTerm, secondTerm]
  );

  const handleFirstTermChange = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (event) => setFirstTerm(event.target.value),
    []
  );

  const handleSecondTermChange = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (event) => setSecondTerm(event.target.value),
    []
  );

  const firstTermId = React.useId();
  const secondTermId = React.useId();
  const outputId = React.useId();

  return (
    <form>
      <label htmlFor={firstTermId}>First term</label>
      <input id={firstTermId} type='number' value={firstTerm} onChange={handleFirstTermChange}/>
      <label htmlFor={secondTermId}>Second term</label>
      <input id={secondTermId} type='number' value={secondTerm} onChange={handleSecondTermChange}/>
      <label htmlFor={outputId}>Sum</label>
      <output id={outputId} htmlFor={`${firstTermId} ${secondTermId}`}>{sum}</output>
    </form>
  );
}
```
In this simple example, this may look like over-engineering. However, most real cases are more complex than this, and that's when this really pays off. We don't want our tests to simulate rendering the same component dozens of times just to check the behaviour of some data conversion algorithm.

## Keeping components pure
This is in fact a general rule of React, and not an internal guideline, but impure components are such a common source of bugs that it should not be unmentioned. A React component should not do any impure operation (for example mutating global data or calling functions with unpredictable output) during the rendering process. A component should behave the same no matter how many times it is rerendered. This is explained in detail in [React's article on keeping components pure](https://react.dev/learn/keeping-components-pure).

## CSS modules
We use CSS modules tied to each component. The file name should match the component name with the suffix `.module.css`. We aim to separate style-related code from the actual content, so avoid using the `style` attribute as much as possible. See [the "CSS and HTML" section](#css-and-html) for detailed guidelines on how we use CSS.

## Naming conventions
- Properties with functions triggered by events should be prefixed with `on`, e.g., `onChange`. If the property calls a function defined within the same component, it should be named `handle` plus the event name, e.g., `onChange={handleChange}`.
- Function names should only start with `handle` when the name describes what triggers the function, not what the function does. For example, a function should not be named `handleSave` if it performs the actual saving; it should simply be named `save`. However, `onChange={save}` is acceptable.
- A component's properties should not override properties with the same name on child components. For example, if a component contains a button and has a property named `onClick`, the button's `onClick` function must call the parent component's `onClick` function with the same data. If the button's `onClick` function is intended to trigger a function on the parent component with different parameters or in more specific cases, the parent component's function must have a different name.
- Hooks built on `useQuery` have the suffix `Query`.
- Hooks built on `useMutation` have the suffix `Mutation`.

## Component tests
We use [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for testing components.

- Selectors in tests should be chosen according to [the priority guidelines](https://testing-library.com/docs/queries/about/#priority).
- All functions used by React components (i.e., functions at the top of the data processing layer) must have their own unit tests.
- We use `toBeInTheDocument` in tests to verify that an element is accessible. (A `get` function is generally sufficient; `toBeInTheDocument` is only to clarify what we are testing.)

## Use of `Context`
`Context` is a very useful tool in React, but it is important to use it sparingly. While it can save many lines of code, it also makes it harder to see what data a component depends on and where it comes from. We use `Context` to solve the following problems:

- **Fetching data from a globally available source.** This could be data from the Tanstack Query store or data from the user's browser, such as cookies and local storage. The advantage of using `Context` in this case is that the components become independent of these sources and consequently it's easier to mock these data in tests. React Router also falls into this category. In tests dependent on React Router, we should use `MemoryRouter` to mock parameters from the URL.
- **Passing data between compound components.** Some components, especially in `@studio/components`, are designed to be used together. When such a component depends on data from a parent component, `Context` is the most natural solution.
- **Internally within large components.** In some situations, it may make sense to use `Context` to manage state data in a large component to avoid props drilling. However, this negatively impacts the scalability of child components using this data, so it is important to only do this when the child components are not intended to be reused elsewhere in the solution. In these situations, we should always consider passing the data through props instead.

In all situations not mentioned above, we pass data through props. It can often be tempting to use `Context` to reduce the number of props, but this does not actually solve much, as the component still has the same **dependencies** on information. `Context` just makes it harder to find the source of the information. Also, if a component has many props, it may be a symptom of poorly structured data.

## Other rules
- As far as possible, use React's built-in `on` properties instead of JavaScript's `addEventListener`.
- `React.Children` should not be used. See [React's documentation on alternatives](https://react.dev/reference/react/Children#alternatives).
- `React.cloneElement` should not be used. See [React's documentation on alternatives](https://react.dev/reference/react/cloneElement#alternatives).

# CSS and HTML
## General
- Global CSS variables within a package should be prefixed with the package name.
- Visual presentation should generally be implemented with CSS only. For example, use `border` in CSS instead of `<hr>` (`divider`) in HTML. This maintains a clear distinction between style and content.
- Avoid using `position` in CSS as much as possible. Many positioning issues can be solved using `flex` and `grid`.
- Avoid hardcoding values like colours and sizes. Use CSS variables, preferably ones used in multiple places. An exception here is media queries, where variables are not available.
- Use relative units (such as `rem` and `em`) to specify sizes for fonts, icons, and spacing. This ensures sizes follow the user's browser settings.
- Use pseudo-classes instead of custom classes and attribute selectors where possible. For example, use `:hover` instead of using JavaScript to determine whether the mouse is over an element, and `:disabled` instead of `[disabled]`.
- `!important` should only be used as a last resort if it is not possible to increase specificity within reasonable limits.

## Class names
- We distinguish between two types of class names: _Main classes_, which describe what something is, and _state classes_, which describe a state.
  - A main class should be a noun, e.g., `button`.
  - A state class should describe the state, e.g., `closed` or `withValue`.
- All elements with one or more state classes should also have a main class. When using a state class in a CSS selector, we should also reference the main class, e.g., `.textField.empty` (here, `textField` is the main class and `empty` is the state class). If we were using the [BEM convention](https://css-tricks.com/bem-101/), this would correspond to `.textField--empty`.
- We do not use the BEM convention. When using CSS modules combined with the rule above, we solve the same challenges that the BEM convention would address.
- Class names should generally not relate to appearance. For example, avoid class names like `red` and `withSpacingOnTop`. See the first point for examples of good class names.

## Choice of CSS tools
We have delibaretely chosen to use plain CSS files with no other tooling than the CSS Modules framework. The reasoning behind this is as follows:
- Modern CSS features make it much easier to work with CSS now than only a few years ago
- There is sufficient browser support for popular features that were previously only available through compile-time tools like Sass and Less
- Developers don't need to learn yet another tool that will probably become obsolete in near future
- Abstracting CSS into own files adheres to the single responsibility principle, since it keeps styling separated from the content, contrary to tools with style-based class names (like Bootstrap and Tailwind) and CSS-in-JS tools (like Styled Components)

# Use native browser tools when possible
In many situations it may look like we need to implement some advanced functionality, while there are already good solutions to the problem available in the browser. In these situations, we should strive to use the native solution. Here are some examples of what this means:
- Use [alert](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert), [confirm](https://developer.mozilla.org/en-US/docs/Web/API/Window/confirm) and [prompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/prompt) instead of custom dialogs
- Use `<input type="date"/>` instead of implementing a custom date picker or using one from a library
- Use native validation tools in forms, e.g., [reportValidity](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reportValidity)
- Use pseudo-classes in CSS instead of React state if possible

This has already been a topic of discussion several times within our team, and one reoccuring argument against this approach is the limited possibility to change the design and content of the built-in tools. But this is also an advantage: Looking the same on every single website, they are very predictable, which in the end is what matters the most for the users.

Here are some other considerable advantages:
- We may spend more time on more important things
- Custom-made solutions for these problems are often associated with bugs, which we don't need to worry about when choosing a built-in one
- Being around in the browsers for many years, these solutions are heavily tested by millions of users
- The solutions are supported by assistive technologies and they automatically adapt to the user's browser settings, all of which add to the list of things we don't need to worry about
- The code becomes more clean and simple


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
