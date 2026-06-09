# Form-component Library for Altinn Studio Apps

This package contains code and UI components for forms in Altinn Studio apps.

It was created to isolate form rendering code from /src/App/frontend. As of May 2026, the library is in early development. More code will be migrated from /src/App/frontend over time.

## Architecture and Vision

### Structure

The library has two main folders:

- **app-components**: Simple React components based on Designsystemet. They receive data via props and report changes through callbacks.
- **layout-components**: The components that a user can select in Designer to build the user interface of their app.

### Altinn Studio Preview

Currently, preview in Altinn Studio uses a prebuilt App-frontend. In the future, previewing should be possible by rendering a React component directly in the Studio application. This would improve the user experience by enabling instant updates using React’s rerendering, instead of reloading the entire app.

The goal is to allow Studio Designer to use this library for application previews. For example, we could export a `FormComponent` that renders a form based on props provided by Altinn Studio.

### Rendering Focus

This library should contain minimal business logic and focus on rendering based on props and data. Business logic should remain in /src/App/frontend or be moved to app-libs/form-engine.

**Guideline:** If code does not depend on React, consider keeping it in /src/App/frontend or move it to app-libs/form-engine. In other words, if we for some reason were to use another library than React, it is beneficial if this library only contains code that actually needs to be rewritten because of that change.
