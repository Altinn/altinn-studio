import React from 'react';

type ContextProvider<T> = [React.Provider<T>, () => T];

type CreateStrictContextProps = {
  options: {
    errorMessage?: string;
    name?: string;
  };
};
export const createStrictContext = <T>(props?: CreateStrictContextProps): ContextProvider<T> => {
  const Context = React.createContext<T | undefined>(undefined);

  const useContext = (): T => {
    const context = React.useContext(Context);
    if (context === undefined) {
      throw new Error(props?.options.errorMessage || `${props?.options.name || ''} Context Provider is missing`);
    }
    return context;
  };

  return [Context.Provider, useContext] as ContextProvider<T>;
};
