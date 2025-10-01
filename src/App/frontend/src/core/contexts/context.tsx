import React, { createContext as createReactContext, memo, useContext } from 'react';
import type { Provider } from 'react';

interface ContextProvider<T> {
  Provider: Provider<T>;
  useCtx: () => T;
  useLaxCtx: () => T | typeof ContextNotProvided;
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
 * Special symbol returned from useLaxCtx() when no provider is present.
 */
export const ContextNotProvided = Symbol('ContextNotProvided');

/**
 * A strict context must always be provided, and will throw an error if it is not. This is useful for contexts that
 * are required for the application to function.
 */
export function createContext<T>({ name, required, ...rest }: CreateContextProps<T>): ContextProvider<T> {
  const defaultValue = 'default' in rest ? rest.default : undefined;
  const Context = createReactContext<{ innerValue: T | undefined; provided: boolean }>({
    innerValue: defaultValue,
    provided: false,
  });
  Context.displayName = name;

  const useHasProvider = () => useContext(Context).provided;

  const useCtx = (): T => {
    const ctx = useContext(Context);
    const value = ctx.innerValue;
    if (!ctx.provided) {
      if (required) {
        throw new Error(`${name} is missing`);
      }
      return defaultValue as T;
    }
    return value as T;
  };

  const useLaxCtx = (): T | typeof ContextNotProvided => {
    const ctx = useContext(Context);
    const value = ctx.innerValue;
    if (!ctx.provided) {
      return ContextNotProvided;
    }
    return value as T;
  };

  const MyProvider = ({ value, children }: Parameters<Provider<T | undefined>>[0]) => (
    <Context.Provider value={{ innerValue: value, provided: true }}>{children}</Context.Provider>
  );

  const RealProvider = memo(MyProvider as Provider<T>);
  RealProvider.displayName = `${name}Provider`;

  return {
    Provider: RealProvider,
    useCtx,
    useLaxCtx,
    useHasProvider,
  };
}
