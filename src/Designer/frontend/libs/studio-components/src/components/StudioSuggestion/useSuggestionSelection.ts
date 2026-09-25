import { useEffect, useRef, useState, type RefObject } from 'react';
import type { SuggestionProps } from '@digdir/designsystemet-react';
import type { StudioSuggestionItem } from './StudioSuggestionItem/StudioSuggestionItem';

/** Keep single-select commits synchronous when leaving a field can unmount it. */
export function useSuggestionSelection(
  props: SuggestionProps,
  suggestionRef: RefObject<HTMLElement | null>,
): SuggestionProps {
  const single = props.multiple === true ? undefined : props;
  const [uncontrolledSelection, setUncontrolledSelection] = useState(() =>
    toItem(single?.defaultSelected),
  );
  const isControlled = single?.selected !== undefined;
  const selection = isControlled ? toItem(single.selected) : uncontrolledSelection;
  const committedOnBlur = useRef<StudioSuggestionItem | null | undefined>(undefined);
  const pendingSelection = useRef<StudioSuggestionItem | null | undefined>(undefined);
  const pressStartedInside = useRef(false);

  const onSelectedChange = (item: StudioSuggestionItem | null): void => {
    pendingSelection.current = undefined;
    // The web component may report our synchronous commit again from its deferred blur handler.
    const duplicate =
      committedOnBlur.current !== undefined && item?.value === committedOnBlur.current?.value;
    committedOnBlur.current = undefined;
    if (duplicate) return;
    if (!isControlled) setUncontrolledSelection(item);
    single?.onSelectedChange?.(item);
  };

  useEffect(() => {
    const element = suggestionRef.current;
    if (props.multiple || !element) return;
    const onBlur = (event: FocusEvent): void => {
      if (
        !pressStartedInside.current &&
        !element.contains(event.relatedTarget as Node | null) &&
        pendingSelection.current !== undefined &&
        pendingSelection.current?.value !== selection?.value
      ) {
        const item = pendingSelection.current;
        onSelectedChange(item);
        committedOnBlur.current = item;
      }
    };
    const endPress = (): void => {
      pressStartedInside.current = false;
    };
    // The datalist stops native blur at the input and replays it later. Capture it before that delay.
    element.addEventListener('blur', onBlur, true);
    document.addEventListener('pointerup', endPress, true);
    document.addEventListener('pointercancel', endPress, true);
    return (): void => {
      element.removeEventListener('blur', onBlur, true);
      document.removeEventListener('pointerup', endPress, true);
      document.removeEventListener('pointercancel', endPress, true);
    };
  });

  if (props.multiple === true) return props;

  return {
    ...props,
    // Own the uncontrolled state too, so a synchronous commit updates the displayed selection.
    defaultSelected: undefined,
    selected: selection,
    onSelectedChange,
    onBeforeMatch: (event): void => {
      props.onBeforeMatch?.(event);
      if (event.currentTarget.control?.matches(':focus')) committedOnBlur.current = undefined;
      // Reuse the combobox's matching, including a consumer's override, instead of matching labels here.
      const option = event.defaultPrevented
        ? Array.from(event.currentTarget.options ?? []).find((item) => item.selected)
        : event.detail;
      const text = event.currentTarget.control?.value.trim() ?? '';
      if (option)
        pendingSelection.current = { value: option.value, label: option.label || option.value };
      else if (props.creatable && text) pendingSelection.current = { value: text, label: text };
      else pendingSelection.current = text ? undefined : null;
    },
    onPointerDown: (event): void => {
      pressStartedInside.current = true;
      props.onPointerDown?.(event);
    },
  };
}

function toItem(
  value: string | StudioSuggestionItem | null | undefined,
): StudioSuggestionItem | null {
  return typeof value === 'string' ? (value ? { value, label: value } : null) : (value ?? null);
}
