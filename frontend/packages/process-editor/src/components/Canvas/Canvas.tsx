import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CogIcon, EyeFillIcon } from '@navikt/aksel-icons';
import { Alert, Button } from '@digdir/design-system-react';
import { useBpmnViewer } from '../../hooks/useBpmnViewer';
import { useBpmnEditor } from '../../hooks/useBpmnEditor';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import classes from './Canvas.module.css';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { Heading, Paragraph } from '@digdir/design-system-react';


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
export const Viewer = (): JSX.Element => {
  const { t } = useTranslation();
  const { canvasRef, bpmnViewerError } = useBpmnViewer();
  const getErrorMessage = (): { heading: string; body: string } | null => {
    if (bpmnViewerError === 'noDiagram') {
      return {
        heading: t('process_editor.not_found_diagram_heading'),
        body: t('process_editor.not_found_diagram_error_message'),
      };
    }
    if (bpmnViewerError === 'noProcess') {
      return {
        heading: t('process_editor.not_found_process_heading'),
        body: t('process_editor.not_found_process_error_message'),
      };
    }
    if(bpmnViewerError === "unknown"){
      return {
        heading: t('process_editor.unknown_heading_error_message'),
        body: t('process_editor.unknown_paragraph_error_message'),
      }
    }
    return null;
  };

  const errorToDisplay = getErrorMessage();
  return (
  <>
  {errorToDisplay && ( 
   <div className={classes.alertContainer}>
    <Alert severity='warning'>
      <Heading size='small' spacing>
        {errorToDisplay.heading}
      </Heading>
      <Paragraph>{errorToDisplay.body}</Paragraph>
    </Alert>
   </div>
  )}
  <div ref={canvasRef}></div>
  </>
  );
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
