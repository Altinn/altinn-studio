import { useEffect, useRef, type RefObject } from 'react';

export type UseCommitPendingClearArgs = {
  /** The element wrapping the input, its clear button and its list of options. */
  rootRef: RefObject<HTMLElement | null>;
  /** The text input the user types in. */
  inputRef: RefObject<HTMLInputElement | null>;
  /** Whether a value is selected, so that an emptied input means the user cleared it. */
  hasSelection: boolean;
  /** Called when the user has emptied the field and moved on to something outside it. */
  onClear: () => void;
};

/**
 * Reports a cleared field the moment the user leaves it, rather than leaving that to the
 * underlying web component.
 *
 * Choosing an option reports the new value straight away, but emptying the field — with the clear
 * button, or by deleting the text — reports nothing until the field loses focus, and the web
 * component does that from a timer rather than from the blur itself. Anything that takes the field
 * off the page in the same gesture therefore wins the race: the custom element is disconnected
 * first, and disconnecting drops the pending change without a trace. That is what happens in the
 * process editor, where clicking the canvas changes the bpmn selection and swaps the whole
 * configuration panel out — the field went empty, and nothing was saved.
 *
 * The clear is therefore reported from here instead, synchronously while the focus is moving, at
 * which point the field is still on the page and no click has been able to unmount anything. The
 * web component's own deferred attempt still runs afterwards and finds nothing left to do; when it
 * does report the same empty selection a second time, every caller already ignores a value it
 * holds.
 *
 * Two kinds of focus loss are not the user leaving the field, and neither of them commits: a press
 * that starts inside it — the clear button and the options in the list both blur the input on
 * mousedown and hand focus back on click — and focus moving to another element within it.
 */
export const useCommitPendingClear = ({
  rootRef,
  inputRef,
  hasSelection,
  onClear,
}: UseCommitPendingClearArgs): void => {
  const latestRef = useRef({ hasSelection, onClear });

  useEffect(() => {
    latestRef.current = { hasSelection, onClear };
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let pressStartedInside: boolean = false;
    const handleMouseDown = (): void => {
      pressStartedInside = true;
    };
    const handleMouseUp = (): void => {
      pressStartedInside = false;
    };

    const handleFocusOut = (event: FocusEvent): void => {
      const input = inputRef.current;
      if (event.target !== input) return;
      if (pressStartedInside) return;
      if (root.contains(event.relatedTarget as Node | null)) return;
      const { hasSelection: isSelected, onClear: clear } = latestRef.current;
      if (!isSelected) return;
      if (input.value.trim() !== '') return;
      clear();
    };

    // Listening on the root in the capture phase: the web component stops the focus events it has
    // handled from traveling any further out from the input itself.
    root.addEventListener('mousedown', handleMouseDown, true);
    root.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('mouseup', handleMouseUp, true);

    return (): void => {
      root.removeEventListener('mousedown', handleMouseDown, true);
      root.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
    };
  }, [rootRef, inputRef]);
};
