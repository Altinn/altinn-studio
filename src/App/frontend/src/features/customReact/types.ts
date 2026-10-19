/**
 * Public contract for app-provided React components (the CustomReact layout component).
 *
 * This file is the source for the type declarations app developers use when building their components. Keep it
 * self-contained (only type imports from 'react'), and treat every change here as a change to a public API:
 * - Adding an optional member is fine.
 * - Removing or changing a member requires bumping CUSTOM_REACT_API_VERSION, which breaks all apps built for the
 *   previous version on purpose (they get a clear error instead of subtle runtime failures). This includes major
 *   upgrades of React and Designsystemet, since apps use the app frontend's copies of both.
 */
import type * as ReactModule from 'react';
import type * as JsxRuntimeModule from 'react/jsx-runtime';

/**
 * A value that can be written to a data model field.
 */
export type CustomReactFormValue = string | number | boolean | null | undefined | string[];

export type CustomReactOptions = Record<string, unknown>;

export interface CustomReactComponentProps<Options extends CustomReactOptions = CustomReactOptions> {
  /**
   * Unique id of this component instance in the page. Inside repeating groups, this includes the row index.
   */
  id: string;

  /**
   * Current values of the data model bindings, keyed by binding name (the keys in `dataModelBindings`). Values are
   * passed as they are in the data model, so numbers stay numbers.
   */
  formData: Readonly<Record<string, unknown>>;

  /**
   * Writes a new value to the data model field for the given binding name.
   */
  setValue: (bindingKey: string, value: CustomReactFormValue) => void;

  /**
   * Texts for all keys in `textResourceBindings`, resolved to the current language.
   */
  texts: Readonly<Record<string, string>>;

  /**
   * The current language code, for example 'nb', 'nn' or 'en'.
   */
  language: string;

  /**
   * True when the component must not let the user change data. Always true in summary mode.
   */
  readOnly: boolean;

  required: boolean;

  /**
   * False when the component has visible validation errors. The validation messages are shown by the app below the
   * component, so use this to style the component as invalid.
   */
  isValid: boolean;

  /**
   * True when the component is rendered as part of a summary, and should present the data rather than let the user
   * edit it.
   */
  summaryMode: boolean;

  /**
   * The `options` object from the layout configuration, passed unchanged.
   */
  options: Readonly<Options>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomReactComponent = ReactModule.ComponentType<CustomReactComponentProps<any>>;

export interface RegisterComponentArgs {
  /**
   * Name used in the layout (the `componentName` property). Lowercase words separated by hyphens.
   */
  name: string;
  component: CustomReactComponent;

  /**
   * The API version the component was built for. Registration fails if the app frontend provides another version.
   */
  apiVersion: number;
}

/**
 * The object available as `window.altinnAppFrontend`.
 */
export interface AltinnAppFrontendApi {
  readonly apiVersion: 1;
  readonly React: typeof ReactModule;
  readonly jsxRuntime: typeof JsxRuntimeModule;

  /**
   * The app frontend's copy of '@digdir/designsystemet-react'. Map the package to this in your build, and import
   * from '@digdir/designsystemet-react' as usual in your code; install the same version as the app frontend for
   * the types. The styles are already loaded by the app frontend. It is typed loosely here, so that apps that do
   * not use Designsystemet do not need to install it.
   */
  readonly Designsystemet: Readonly<Record<string, unknown>>;
  readonly registerComponent: (args: RegisterComponentArgs) => void;
}
