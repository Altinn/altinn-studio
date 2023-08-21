import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CogIcon, EyeFillIcon } from '@navikt/aksel-icons';
import { Button } from '@digdir/design-system-react';
import { useBpmnViewer } from '../../hooks/useBpmnViewer';
import { useBpmnEditor } from '../../hooks/useBpmnEditor';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import classes from './Canvas.module.css';
import { useBpmnContext } from '../../contexts/BpmnContext';

export type CanvasProps = {
  onSave: (bpmnXml: string) => void;
};

export const Canvas = ({ onSave }: CanvasProps): JSX.Element => {
  const { getUpdatedXml } = useBpmnContext();
  const [isEditorView, setIsEditorView] = useState(false);

  const toggleViewModus = (): void => {
    setIsEditorView((prevIsEditorView) => !prevIsEditorView);
  };

  const handleOnSave = async (): Promise<void> => {
    onSave(await getUpdatedXml());
  };

  return (
    <>
      <CanvasActionMenu
        onSave={handleOnSave}
        toggleViewModus={toggleViewModus}
        isEditorView={isEditorView}
      />
      {isEditorView ? <Editor /> : <Viewer />}
    </>
  );
};


// Below is helper components for Canvas.tsx
const Viewer = (): JSX.Element => {
  const { canvasRef } = useBpmnViewer();
  return <div ref={canvasRef}></div>;
};

const Editor = (): JSX.Element => {
  const { canvasRef } = useBpmnEditor();
  return <div ref={canvasRef}></div>;
};

type CanvasActionsProps = {
  isEditorView: boolean;
  onSave: () => void;
  toggleViewModus: () => void;
};

const CanvasActionMenu = ({
  isEditorView,
  onSave,
  toggleViewModus,
}: CanvasActionsProps): JSX.Element => {
  const { t } = useTranslation();
  const { numberOfUnsavedChanges } = useBpmnContext();

  return (
    <span className={classes.canvasMenuContainer}>
      <Button
        onClick={toggleViewModus}
        variant='outline'
        icon={isEditorView ? <EyeFillIcon /> : <CogIcon />}
      >
        {isEditorView ? t('process_editor.view_mode') : t('process_editor.edit_mode')}
      </Button>
      {numberOfUnsavedChanges > 0 && (
        <span className={classes.unsavedChanges}>
          {t('process_editor.unsaved_changes', { count: numberOfUnsavedChanges })}
        </span>
      )}
      {isEditorView ? (
        <Button onClick={onSave} color='success'>
          {t('process_editor.save')}
        </Button>
      ) : (
        <div></div>
      )}
    </span>
  );
};
