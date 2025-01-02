import { useMemo } from 'react';
import { useStudioInputTableContext } from '../StudioInputTableContext';
import type { EventPropsBase } from '../types/EventPropsBase';

export function useEventProps<BlurInput, FocusInput, ChangeInput>({
  onBlur,
  onFocus,
  onChange,
}: EventPropsBase<BlurInput, FocusInput, ChangeInput>): EventPropsBase<
  BlurInput,
  FocusInput,
  ChangeInput
> {
  const { onChangeAny, onBlurAny, onFocusAny } = useStudioInputTableContext();

  return useMemo<EventPropsBase<BlurInput, FocusInput, ChangeInput>>(
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
