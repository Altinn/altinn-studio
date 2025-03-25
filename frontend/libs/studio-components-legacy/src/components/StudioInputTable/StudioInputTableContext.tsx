import { createContext, useContext } from 'react';
import type { EventPropName } from './types/EventPropName';

export type StudioInputTableContextValue = {
  [Key in EventPropName as `${Key}Any`]?: () => void;
};

export const StudioInputTableContext = createContext<StudioInputTableContextValue>(null);

export function useStudioInputTableContext() {
  return useContext<StudioInputTableContextValue>(StudioInputTableContext);
}
