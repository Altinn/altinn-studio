import { useEffect, useRef, type FocusEvent } from 'react';

export type UseCommitPendingClearArgs = {
  /** Whether a value is selected, so that an emptied input means the user cleared it. */
  hasSelection: boolean;
  /** Called when the user has emptied the field and moved on to something outside it. */
  onClear: () => void;
};

/** Handlers for the element wrapping the input, its clear button and its list of options. */
export type CommitPendingClearHandlers = {
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onMouseDown: () => void;
};

/**
 * The web component reports an emptied single-select field only when it loses focus, from a
 * `setTimeout`, and disconnecting drops that pending report — so a click that unmounts the field
 * in the same gesture (the process editor canvas) loses the clear. These handlers report the clear
 * synchronously in `focusout` instead. Two focus losses do not commit: a press that started inside
 * the field (the clear button, the options), and focus moving to another element inside it.
 */
export const useCommitPendingClear = ({
  hasSelection,
  onClear,
}: UseCommitPendingClearArgs): CommitPendingClearHandlers => {
  const pressStartedInsideRef = useRef<boolean>(false);

  useEffect(() => {
    const handleMouseUp = (): void => {
      pressStartedInsideRef.current = false;
    };
    document.addEventListener('mouseup', handleMouseUp, true);
    return (): void => document.removeEventListener('mouseup', handleMouseUp, true);
  }, []);

  const onMouseDown = (): void => {
    pressStartedInsideRef.current = true;
  };

  const onBlur = (event: FocusEvent<HTMLElement>): void => {
    const { currentTarget: root, target, relatedTarget } = event;
    if (!(target instanceof HTMLInputElement)) return;
    if (pressStartedInsideRef.current) return;
    if (root.contains(relatedTarget)) return;
    if (!hasSelection) return;
    if (target.value.trim() !== '') return;
    onClear();
  };

  return { onBlur, onMouseDown };
};
