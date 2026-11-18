import { useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { parseAndCleanText } from '@app/form-component';
import { TEXT_KEY_ATTRIBUTE } from '../../constants';
import { useTextEditing } from './TextEditingContext';
import classes from './EditableText.module.css';

export type EditableTextProps = {
  textKey: string;
  text: string;
};

// Markdown and HTML are shown formatted, and as the raw text while the user edits it.
const markupPattern = /[*_#`[\]<>]/;

/**
 * An app text on the canvas that the user edits where it is. Enter or leaving the text saves it,
 * Escape undoes the change. It is marked with its key, so the canvas can tell texts from controls.
 */
export function EditableText({ textKey, text }: EditableTextProps): ReactElement {
  const { t } = useTranslation();
  const { saveText } = useTextEditing();
  const ref = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  // The user edits the DOM directly, so the span is remounted after each edit to give React back
  // a DOM it knows.
  const [version, setVersion] = useState<number>(0);
  const isCancelledRef = useRef<boolean>(false);
  const hasMarkup = markupPattern.test(text);
  const attributes = { [TEXT_KEY_ATTRIBUTE]: textKey };

  // Swapping the formatted text for the raw text moves the caret, so it is put back at the end.
  useLayoutEffect(() => {
    if (isEditing && hasMarkup && ref.current) placeCaretAtEnd(ref.current);
  }, [isEditing, hasMarkup]);

  const handleBlur = (event: FocusEvent<HTMLSpanElement>): void => {
    const value = (event.currentTarget.textContent ?? '').trim();
    if (!isCancelledRef.current && value !== text) saveText(textKey, value);
    isCancelledRef.current = false;
    setIsEditing(false);
    setVersion((current) => current + 1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      isCancelledRef.current = true;
      event.currentTarget.blur();
    }
  };

  return (
    <span
      {...attributes}
      key={version}
      ref={ref}
      className={classes.editableText}
      contentEditable='plaintext-only'
      suppressContentEditableWarning
      role='textbox'
      aria-label={t('app_builder.edit_text')}
      tabIndex={0}
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {isEditing || !hasMarkup ? text : parseAndCleanText(text)}
    </span>
  );
}

function placeCaretAtEnd(element: HTMLElement): void {
  const selection = element.ownerDocument.getSelection();
  if (!selection) return;
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}
