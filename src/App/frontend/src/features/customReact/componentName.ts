/**
 * Names of app-provided React components, as registered through `window.altinnAppFrontend.registerComponent()` and
 * referenced by `componentName` in CustomReact layout components. Lowercase words separated by single hyphens, so
 * that names are easy to read in layout files, and do not depend on case sensitivity.
 */
export const CUSTOM_REACT_COMPONENT_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
