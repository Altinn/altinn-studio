import React, { useState } from 'react';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import classes from './Canvas.module.css';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { supportsProcessEditor } from '../../utils/processEditorUtils';
import { BPMNViewer } from './BPMNViewer';
import { BPMNEditor } from './BPMNEditor';
import { CanvasActionMenu } from './CanvasActionMenu';

export type CanvasProps = {
  onSave: (bpmnXml: string) => void;
  appLibVersion: string;
};

/**
 * @component
 *  Displays the canvas area of the ProcessEditor
 *
 * @property {function}[onSave] - Function to be executed when saving the canvas
 * @property {string}[appLibVersion] - The app-lib version the user has
 *
 * @returns {ReactNode} - The rendered component
 */
export const Canvas = ({ onSave, appLibVersion }: CanvasProps): JSX.Element => {
  const { getUpdatedXml } = useBpmnContext();
  const [isEditorView, setIsEditorView] = useState(false);

  const toggleViewModus = (): void => {
    setIsEditorView((prevIsEditorView) => !prevIsEditorView);
  };

  const handleOnSave = async (): Promise<void> => {
    onSave(await getUpdatedXml());
  };

  const isEditAllowed: boolean = supportsProcessEditor(appLibVersion);

  return (
    <>
      {(isEditAllowed || shouldDisplayFeature('shouldOverrideAppLibCheck')) && (
        <CanvasActionMenu
          onSave={handleOnSave}
          toggleViewModus={toggleViewModus}
          isEditorView={isEditorView}
        />
      )}
      <div className={classes.wrapper}>
        {isEditorView ? <BPMNEditor /> : <BPMNViewer appLibVersion={appLibVersion} />}
      </div>
    </>
  );
};
