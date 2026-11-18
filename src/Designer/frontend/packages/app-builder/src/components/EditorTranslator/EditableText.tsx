import type { ReactElement } from 'react';
import { parseAndCleanText } from '@app/form-component';
import cn from 'classnames';
import { TEXT_KEY_ATTRIBUTE } from '../../constants';
import { useCanvasState } from '../CanvasState/CanvasStateContext';
import classes from './EditableText.module.css';

export type EditableTextProps = {
  textKey: string;
  text: string;
};

/**
 * Shows an app text on the canvas and marks it with its key, so a click on it can open the text
 * editor. It is hidden while it is edited, since the editor is placed over it.
 */
export function EditableText({ textKey, text }: EditableTextProps): ReactElement {
  const { editingText } = useCanvasState();
  const isEditing = editingText?.textKey === textKey;
  const attributes = { [TEXT_KEY_ATTRIBUTE]: textKey };

  return (
    <span {...attributes} className={cn(classes.editableText, { [classes.editing]: isEditing })}>
      {parseAndCleanText(text)}
    </span>
  );
}
