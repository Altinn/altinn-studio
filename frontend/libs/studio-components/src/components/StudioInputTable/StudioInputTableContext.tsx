import { createContext, useContext } from 'react';
import type { HTMLCellInputElement } from './types/HTMLCellInputElement';
import type { EventProps } from './types/EventProps';
import type { EventPropName } from './types/EventPropName';

export type StudioInputTableContextValue<
  Element extends HTMLCellInputElement = HTMLCellInputElement,
> = {
  [Key in EventPropName as `${Key}Any`]?: EventProps<Element>[Key];
};

export const StudioInputTableContext = createContext<StudioInputTableContextValue>(null);

export function useStudioInputTableContext<Element extends HTMLCellInputElement>() {
  return useContext<StudioInputTableContextValue<Element>>(StudioInputTableContext);
}
