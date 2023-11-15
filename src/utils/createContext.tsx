import React from 'react';

interface ContextProvider<T> {
  Provider: React.Provider<T>;
  useCtx: () => T;
}

interface LaxContextProvider<T> extends ContextProvider<T | undefined> {
  useHasProvider: () => boolean;
}

type StrictContextProps = {
  errorMessage?: string;
  name: string;
};

/**
 * A strict context must always be provided, and will throw an error if it is not. This is useful for contexts that
 * are required for the application to function.
 */
export function createStrictContext<T>(props: StrictContextProps): ContextProvider<T> {
  const Context = React.createContext<T | undefined>(undefined);

  const useCtx = (): T => {
    const context = React.useContext(Context);
    if (context === undefined) {
      throw new Error(props?.errorMessage || `${props.name} is missing`);
    }
    return context;
  };

  return { Provider: Context.Provider as React.Provider<T>, useCtx };
}

/**
 * Non-strict contexts can be used without a provider, and will return undefined if no provider is found.
 * This is just a wrapper around the React.createContext function, and provides a slightly nicer API.
 */
export function createLaxContext<T>(initialState?: T): LaxContextProvider<T | undefined> {
  const Context = React.createContext<{ innerValue: T | undefined; provided: boolean }>({
    innerValue: initialState,
    provided: false,
  });
  const useCtx = () => React.useContext(Context).innerValue;
  const useHasProvider = () => Boolean(React.useContext(Context).provided);

  const Provider = ({ value, children }: Parameters<React.Provider<T | undefined>>[0]) => (
    <Context.Provider value={{ innerValue: value, provided: true }}>{children}</Context.Provider>
  );

  return {
    Provider: Provider as React.Provider<T | undefined>,
    useCtx,
    useHasProvider,
  };
}
