import type { HTMLAttributes } from 'react';
import { useMemo } from 'react';
import { useStudioInputTableContext } from '../StudioInputTableContext';
import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';
import type { EventProps } from '../types/EventProps';

export function useEventProps<Element extends HTMLCellInputElement>({
  onBlur,
  onFocus,
  onChange,
}: Partial<HTMLAttributes<Element>>): EventProps<Element> {
  const { onChangeAny, onBlurAny, onFocusAny } = useStudioInputTableContext<Element>();

  return useMemo<EventProps<Element>>(
    () => ({
      onChange: (event) => {
        onChange?.(event);
        onChangeAny?.(event);
      },
      onFocus: (event) => {
        onFocus?.(event);
        onFocusAny?.(event);
      },
      onBlur: (event) => {
        onBlur?.(event);
        onBlurAny?.(event);
      },
    }),
    [onChange, onFocus, onBlur, onChangeAny, onBlurAny, onFocusAny],
  );
}
