import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@digdir/design-system-react';
import { CogIcon, EyeFillIcon, SignLanguageTwoHandsIcon } from '@navikt/aksel-icons';
import { useBpmnViewer } from '../../hooks/useBpmnViewer';
import { useBpmnEditor } from '../../hooks/useBpmnEditor';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import classes from './Canvas.module.css';

export type CanvasProps = {
  bpmnXml: string | undefined | null;
};

export const Canvas = ({ bpmnXml }: CanvasProps): JSX.Element => {
  const { t } = useTranslation();
  const [isEditorView, setIsEditorView] = React.useState(false);

  const toggleViewModus = (): void => {
    setIsEditorView((prevIsEditorView) => !prevIsEditorView);
  };

  return (
    <>
      <span className={classes.canvasMenuContainer}>
        <Button onClick={toggleViewModus} icon={isEditorView ? <EyeFillIcon /> : <CogIcon />}>
          {isEditorView ? t('process_editor_view_mode') : t('process_editor_edit_mode')}
        </Button>

        {isEditorView && (
          <Button onClick={() => {}} color='success' icon={<SignLanguageTwoHandsIcon />}>
            {t('process_editor_save')}
          </Button>
        )}
      </span>
      {isEditorView ? <Editor bpmnXml={bpmnXml} /> : <Viewer bpmnXml={bpmnXml} />}
    </>
  );
};

const Viewer = ({ bpmnXml }: CanvasProps): JSX.Element => {
  const { canvasRef } = useBpmnViewer(bpmnXml);
  return <div ref={canvasRef}></div>;
};

const Editor = ({ bpmnXml }: CanvasProps): JSX.Element => {
  const { canvasRef } = useBpmnEditor(bpmnXml);
  return <div ref={canvasRef}></div>;
};
