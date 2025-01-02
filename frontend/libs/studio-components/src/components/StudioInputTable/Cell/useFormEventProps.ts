import type { ChangeEvent, FocusEvent, HTMLAttributes } from 'react';
import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';
import type { EventProps } from '../types/EventProps';
import { useEventProps } from './useEventProps';

export function useFormEventProps<Element extends HTMLCellInputElement>(
  props: Partial<HTMLAttributes<Element>>,
): EventProps<Element> {
  return useEventProps<FocusEvent<Element>, FocusEvent<Element>, ChangeEvent<Element>>(props);
}
