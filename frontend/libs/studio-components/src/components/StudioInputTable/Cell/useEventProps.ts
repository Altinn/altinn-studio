import { useMemo } from 'react';
import { useStudioInputTableContext } from '../StudioInputTableContext';
import type { EventProps } from '../types/EventProps';

export function useEventProps<BlurInput, FocusInput, ChangeInput>({
  onBlur,
  onFocus,
  onChange,
}: EventProps<BlurInput, FocusInput, ChangeInput>): EventProps<BlurInput, FocusInput, ChangeInput> {
  const { onChangeAny, onBlurAny, onFocusAny } = useStudioInputTableContext();

  return useMemo<EventProps<BlurInput, FocusInput, ChangeInput>>(
    () => ({
      onChange: (input) => {
        onChange?.(input);
        onChangeAny?.();
      },
      onFocus: (input) => {
        onFocus?.(input);
        onFocusAny?.();
      },
      onBlur: (input) => {
        onBlur?.(input);
        onBlurAny?.();
      },
    }),
    [onChange, onFocus, onBlur, onChangeAny, onBlurAny, onFocusAny],
  );
}
