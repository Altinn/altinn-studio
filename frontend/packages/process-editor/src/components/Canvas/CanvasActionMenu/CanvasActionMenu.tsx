import React, { ReactNode } from 'react';
import classes from './CanvasActionMenu.module.css';
import { useTranslation } from 'react-i18next';
import { Button } from '@digdir/design-system-react';
import { useBpmnContext } from '../../../contexts/BpmnContext';

export type CanvasActionMenuProps = {
  onSave: () => void;
};

/**
 * @component
 *  Displays the action menu in the canvas
 *
 * @property {boolean}[isEditorView] - Flag to decide the button content
 * @property {function}[onSave] - Function to be executed when saving
 * @property {function}[toggleViewModus] - Function that toggles the view mode
 *
 * @returns {ReactNode} - The rendered component
 */
export const CanvasActionMenu = ({ onSave }: CanvasActionMenuProps): ReactNode => {
  const { t } = useTranslation();
  const { numberOfUnsavedChanges } = useBpmnContext();

  return (
    <span className={classes.canvasMenuContainer}>
      {numberOfUnsavedChanges > 0 && (
        <span className={classes.unsavedChanges}>
          {t('process_editor.unsaved_changes', { count: numberOfUnsavedChanges })}
        </span>
      )}

      <Button className={classes.saveButton} onClick={onSave} color='success'>
        {t('process_editor.save')}
      </Button>
    </span>
  );
};
