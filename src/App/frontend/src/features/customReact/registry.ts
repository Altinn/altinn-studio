import { useSyncExternalStore } from 'react';

import { CUSTOM_REACT_COMPONENT_NAME_PATTERN } from 'src/features/customReact/componentName';
import type { CustomReactComponent, RegisterComponentArgs } from 'src/features/customReact/types';

export const CUSTOM_REACT_API_VERSION = 1;

const components = new Map<string, CustomReactComponent>();
const listeners = new Set<() => void>();

function isComponent(value: unknown): value is CustomReactComponent {
  // Function and class components are functions, while memo() and forwardRef() return objects
  return typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value);
}

/**
 * Registers an app-provided React component, so that CustomReact layout components can render it. This is exposed
 * to apps through window.altinnAppFrontend. Invalid registrations throw, so that the app developer sees the error
 * in the browser console where the app script calls this.
 */
export function registerComponent(args: RegisterComponentArgs): void {
  if (typeof args !== 'object' || args === null) {
    throw new Error('altinnAppFrontend.registerComponent() expects an object with name, component and apiVersion');
  }

  const { name, component, apiVersion } = args;
  if (apiVersion !== CUSTOM_REACT_API_VERSION) {
    throw new Error(
      `Cannot register React component "${String(name)}": it was built for API version ${String(apiVersion)}, ` +
        `but this app frontend provides API version ${CUSTOM_REACT_API_VERSION}`,
    );
  }
  if (typeof name !== 'string' || !CUSTOM_REACT_COMPONENT_NAME_PATTERN.test(name)) {
    throw new Error(
      `Cannot register React component "${String(name)}": the name must be lowercase words separated by hyphens, ` +
        `for example "my-org-map"`,
    );
  }
  if (!isComponent(component)) {
    throw new Error(`Cannot register React component "${name}": the component is not a React component`);
  }
  if (components.has(name)) {
    throw new Error(`Cannot register React component "${name}": a component with this name is already registered`);
  }

  components.set(name, component);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns the registered component with the given name, and re-renders when it is registered later.
 */
export function useRegisteredComponent(name: string): CustomReactComponent | undefined {
  return useSyncExternalStore(
    subscribe,
    () => components.get(name),
    () => components.get(name),
  );
}
