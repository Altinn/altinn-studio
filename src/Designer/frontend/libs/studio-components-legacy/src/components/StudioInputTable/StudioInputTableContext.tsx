import React, { createContext, useContext } from 'react';
import type { EventPropName } from './types/EventPropName';
import type { ComponentProps, Context } from 'react';

export type StudioInputTableContextValue = {
  [Key in EventPropName as `${Key}Any`]?: () => void;
};

const StudioInputTableContext = createContext<StudioInputTableContextValue | null>(null);

export function useStudioInputTableContext(): StudioInputTableContextValue {
  const contextValue = useContext<StudioInputTableContextValue | null>(StudioInputTableContext);
  /* istanbul ignore if */
  if (contextValue === null) {
    throw new Error(
      'useStudioInputTableContext must be used within a StudioInputTableContextProvider.',
    );
  }
  return contextValue;
}

export type StudioInputTableContextProviderProps = ComponentProps<
  Context<StudioInputTableContextValue>['Provider']
>;

export function StudioInputTableContextProvider(
  props: StudioInputTableContextProviderProps,
): React.ReactElement {
  return <StudioInputTableContext.Provider {...props} />;
}
