import React, { ReactNode } from 'react';
import classes from './CanvasActionMenu.module.css';
import { useTranslation } from 'react-i18next';
import { CogIcon, EyeFillIcon } from '@studio/icons';
import { Button } from '@digdir/design-system-react';
import { useBpmnContext } from '../../../contexts/BpmnContext';

export type CanvasActionMenuProps = {
  isEditorView: boolean;
  onSave: () => void;
  toggleViewModus: () => void;
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
export const CanvasActionMenu = ({
  isEditorView,
  onSave,
  toggleViewModus,
}: CanvasActionMenuProps): ReactNode => {
  const { t } = useTranslation();
  const { numberOfUnsavedChanges } = useBpmnContext();

  return (
    <span className={classes.canvasMenuContainer}>
      <Button
        onClick={toggleViewModus}
        variant='secondary'
        icon={isEditorView ? <EyeFillIcon /> : <CogIcon />}
      >
        {isEditorView ? t('process_editor.view_mode') : t('process_editor.edit_mode')}
      </Button>
      {numberOfUnsavedChanges > 0 && (
        <span className={classes.unsavedChanges}>
          {t('process_editor.unsaved_changes', { count: numberOfUnsavedChanges })}
        </span>
      )}
      {isEditorView && (
        <Button onClick={onSave} color='success'>
          {t('process_editor.save')}
        </Button>
      )}
    </span>
  );
};
