import React, { ReactNode } from 'react';
import classes from './CanvasActionMenu.module.css';
import { useTranslation } from 'react-i18next';
import { Button, Paragraph } from '@digdir/design-system-react';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { VersionHelpText } from '../VersionHelpText';

export type CanvasActionMenuProps = {
  onSave: () => void;
};

/**
 * @component
 *  Displays the action menu in the canvas
 *
 * @property {function}[onSave] - Function to be executed when saving
 *
 * @returns {ReactNode} - The rendered component
 */
export const CanvasActionMenu = ({ onSave }: CanvasActionMenuProps): ReactNode => {
  const { t } = useTranslation();
  const { numberOfUnsavedChanges, isEditAllowed } = useBpmnContext();

  return (
    <span className={classes.canvasMenuContainer}>
      <div>{!isEditAllowed && <VersionHelpText />}</div>
      {isEditAllowed && numberOfUnsavedChanges > 0 && (
        <Paragraph className={classes.unsavedChanges}>
          {t('process_editor.unsaved_changes', { count: numberOfUnsavedChanges })}
        </Paragraph>
      )}
      {isEditAllowed && (
        <Button onClick={onSave} color='success'>
          {t('process_editor.save')}
        </Button>
      )}
    </span>
  );
};
