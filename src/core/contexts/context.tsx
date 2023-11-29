import React from 'react';

interface ContextProvider<T> {
  Provider: React.Provider<T>;
  useCtx: () => T;
  useHasProvider: () => boolean;
}

interface BaseProps {
  // The name of the context. This is used for error messages and loading indicators.
  name: string;
  required: boolean;
}

export interface StrictContextProps extends BaseProps {
  // If the context is required, it will throw an error if no provider is found. You can also use the useHasProvider
  // hook to check if a provider is present.
  required: true;
}

export interface LaxContextProps<T> extends BaseProps {
  // If the context is not required, it will return undefined if no provider is found. If you need to check if a
  // provider is present, (but the data is undefined) you can use the useHasProvider hook.
  required: false;

  // The default state of the context. This is only relevant for (re)lax(ed) contexts. Even if there is no provider,
  // the default state will be returned. This makes it possible to have strictly typed contexts that are not required,
  // but will always return a default value.
  default: T;
}

export type CreateContextProps<T> = StrictContextProps | LaxContextProps<T>;

/**
 * A strict context must always be provided, and will throw an error if it is not. This is useful for contexts that
 * are required for the application to function.
 */
export function createContext<T>({ name, required, ...rest }: CreateContextProps<T>): ContextProvider<T> {
  const defaultValue = 'default' in rest ? rest.default : undefined;
  const Context = React.createContext<{ innerValue: T | undefined; provided: boolean }>({
    innerValue: defaultValue,
    provided: false,
  });

  const useHasProvider = () => Boolean(React.useContext(Context).provided);

  const useCtx = (): T => {
    const hasProvider = useHasProvider();
    const value = React.useContext(Context)?.innerValue;
    if (!hasProvider) {
      if (required) {
        throw new Error(`${name} is missing`);
      }
      return defaultValue as T;
    }
    return value as T;
  };

  const Provider = ({ value, children }: Parameters<React.Provider<T | undefined>>[0]) => (
    <Context.Provider value={{ innerValue: value, provided: true }}>{children}</Context.Provider>
  );

  return { Provider: Provider as React.Provider<T>, useCtx, useHasProvider };
}
