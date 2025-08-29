import type { ChangeEvent, FocusEvent, HTMLAttributes } from 'react';
import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';
import type { FormEventProps } from '../types/FormEventProps';
import { useEventProps } from './useEventProps';

export function useFormEventProps<Element extends HTMLCellInputElement>(
  props: Partial<HTMLAttributes<Element>>,
): FormEventProps<Element> {
  return useEventProps<FocusEvent<Element>, FocusEvent<Element>, ChangeEvent<Element>>(props);
}
