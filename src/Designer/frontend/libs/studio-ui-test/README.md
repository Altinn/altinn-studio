# @studio/ui-test

`@studio/ui-test` is a library consisting of tools for testing React components.
It should only be imported in test files as a dev dependency.

Here are some of the exported modules:

## `studioTest`

`studioTest` is a facade of the `jest` module.

## `renderAndRunTimers`

`renderAndRunTimers` is used like `render` from React Testing Library,
but it also makes sure that timers are run when `render` returns.
This is necessary when rendering components from versions 1.12 and newer of The Design System.
These components are built on custom elements that use asynchronous functions to update themselves after being loaded.
This happens outside of React's lifecycle, meaning they are not yet ready when the `render` function returns.
