// The jest-dom matchers for Vitest, also for tsconfig-strict.json, which does not include the test setup.
/// <reference types="@testing-library/jest-dom/vitest" />

declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const content: string;
  export default content;
}
