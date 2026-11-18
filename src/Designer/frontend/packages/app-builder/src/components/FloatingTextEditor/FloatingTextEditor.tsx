import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';
import classes from './FloatingTextEditor.module.css';

export type FloatingTextEditorProps = {
  /** The element showing the text. The editor is placed over it and takes its font. */
  anchor: HTMLElement;
  /** The positioned element that the editor is placed in. */
  container: HTMLElement;
  value: string;
  label: string;
  onSave: (value: string) => void;
  onCancel: () => void;
};

/**
 * A text field drawn over a text on the canvas, so the text never has to be editable inside the
 * component itself, where it may sit inside a label or a button. Enter or a click outside saves,
 * Shift+Enter adds a line break, and Escape cancels.
 */
export function FloatingTextEditor({
  anchor,
  container,
  value,
  label,
  onSave,
  onCancel,
}: FloatingTextEditorProps): ReactElement {
  const [draft, setDraft] = useState<string>(value);
  const [style, setStyle] = useState<CSSProperties>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isClosedRef = useRef<boolean>(false);

  useLayoutEffect(() => {
    setStyle(getEditorStyle(anchor, container));
  }, [anchor, container]);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const close = (action: () => void): void => {
    if (isClosedRef.current) return;
    isClosedRef.current = true;
    action();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(onCancel);
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      close(() => onSave(draft));
    }
  };

  return (
    <textarea
      ref={textareaRef}
      aria-label={label}
      className={classes.floatingTextEditor}
      style={style}
      value={draft}
      rows={1}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => close(() => onSave(draft))}
    />
  );
}

const minimumWidth = 120;

function getEditorStyle(anchor: HTMLElement, container: HTMLElement): CSSProperties {
  const anchorRect = anchor.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const computedStyle = anchor.ownerDocument.defaultView?.getComputedStyle(anchor);
  return {
    top: anchorRect.top - containerRect.top + container.scrollTop,
    left: anchorRect.left - containerRect.left + container.scrollLeft,
    minWidth: Math.max(anchorRect.width, minimumWidth),
    maxWidth: containerRect.right - anchorRect.left,
    fontFamily: computedStyle?.fontFamily,
    fontSize: computedStyle?.fontSize,
    fontWeight: computedStyle?.fontWeight,
    lineHeight: computedStyle?.lineHeight,
  };
}
