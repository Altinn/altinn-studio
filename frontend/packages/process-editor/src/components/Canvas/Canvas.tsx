import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import classes from './Canvas.module.css';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { BPMNViewer } from './BPMNViewer';
import { BPMNEditor } from './BPMNEditor';
import { CanvasActionMenu } from './CanvasActionMenu';
import { useConfirmNavigation } from './useConfirmNavigation';

export type CanvasProps = {
  onSave: (bpmnXml: string) => void;
};

/**
 * @component
 *  Displays the canvas area of the ProcessEditor
 *
 * @property {function}[onSave] - Function to be executed when saving the canvas
 * @property {string}[appLibVersion] - The app-lib version the user has
 *
 * @returns {JSX.Element} - The rendered component
 */
export const Canvas = ({ onSave }: CanvasProps): JSX.Element => {
  const { getUpdatedXml, isEditAllowed, numberOfUnsavedChanges } = useBpmnContext();
  const [isEditorView, setIsEditorView] = useState(false);
  const { t } = useTranslation();

  const toggleViewModus = (): void => {
    setIsEditorView((prevIsEditorView) => !prevIsEditorView);
  };

  const handleOnSave = async (): Promise<void> => {
    onSave(await getUpdatedXml());
  };

  useConfirmNavigation(!!numberOfUnsavedChanges, t('process_editor.unsaved_changes_warning'));

  return (
    <div className={classes.container}>
      {isEditAllowed && (
        <CanvasActionMenu
          onSave={handleOnSave}
          toggleViewModus={toggleViewModus}
          isEditorView={isEditorView}
        />
      )}
      <div className={classes.wrapper}>{isEditorView ? <BPMNEditor /> : <BPMNViewer />}</div>
    </div>
  );
};
