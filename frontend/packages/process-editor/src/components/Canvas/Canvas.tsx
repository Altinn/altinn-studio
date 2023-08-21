import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@digdir/design-system-react';
import { CogIcon, EyeFillIcon } from '@navikt/aksel-icons';
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
  const { t } = useTranslation();
  const { getUpdatedXml, numberOfUnsavedChanges } = useBpmnContext();
  const [isEditorView, setIsEditorView] = useState(false);

  const toggleViewModus = (): void => {
    setIsEditorView((prevIsEditorView) => !prevIsEditorView);
  };

  const handleOnSave = async (): Promise<void> => {
    onSave(await getUpdatedXml());
  };

  return (
    <>
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
        <Button onClick={handleOnSave} variant='outline' color='success'>
          {t('process_editor.save')}
        </Button>
      </span>
      {isEditorView ? <Editor /> : <Viewer />}
    </>
  );
};

const Viewer = (): JSX.Element => {
  const { canvasRef } = useBpmnViewer();
  return <div ref={canvasRef}></div>;
};

const Editor = (): JSX.Element => {
  const { canvasRef } = useBpmnEditor();
  return <div ref={canvasRef}></div>;
};
