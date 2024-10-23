import { createContext, HTMLAttributes, useContext } from 'react';
import { HTMLCellInputElement } from './types/HTMLCellInputElement';

export type StudioInputTableContextValue<
  Element extends HTMLCellInputElement = HTMLCellInputElement,
> = {
  onBlurAny?: HTMLAttributes<Element>['onBlur'];
  onChangeAny?: HTMLAttributes<Element>['onChange'];
  onFocusAny?: HTMLAttributes<Element>['onFocus'];
};

export const StudioInputTableContext = createContext<StudioInputTableContextValue>(null);

export function useStudioInputTableContext<Element extends HTMLCellInputElement>() {
  return useContext<StudioInputTableContextValue<Element>>(StudioInputTableContext);
}
