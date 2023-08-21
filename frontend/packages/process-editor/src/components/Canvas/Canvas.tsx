import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@digdir/design-system-react';
import { CogIcon, EyeFillIcon } from '@navikt/aksel-icons';
import { useBpmnViewer } from '../../hooks/useBpmnViewer';
import { useBpmnEditor } from '../../hooks/useBpmnEditor';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import classes from './Canvas.module.css';
import Modeler from 'bpmn-js/lib/Modeler';

export type CanvasProps = {
  bpmnXml: string | undefined | null;
  onSave: (bpmnXml: string) => void;
};

export const Canvas = ({ bpmnXml, onSave }: CanvasProps): JSX.Element => {
  const { t } = useTranslation();
  const [isEditorView, setIsEditorView] = React.useState(false);
  const modelerRef = React.useRef<Modeler | null>(null);

  const toggleViewModus = (): void => {
    setIsEditorView((prevIsEditorView) => !prevIsEditorView);
  };

  const handleOnSave = async () => {
    if (!modelerRef.current) {
      console.warn('Modeler not ready');
      return;
    }
    const { xml } = await modelerRef.current.saveXML({ format: true });
    onSave(xml);
  };

  return (
    <>
      <span className={classes.canvasMenuContainer}>
        <Button
          onClick={toggleViewModus}
          variant='outline'
          icon={isEditorView ? <EyeFillIcon /> : <CogIcon />}
        >
          {isEditorView ? t('process_editor_view_mode') : t('process_editor_edit_mode')}
        </Button>

        <Button onClick={handleOnSave} variant='outline' color='success'>
          {t('process_editor_save')}
        </Button>
      </span>
      {isEditorView ? (
        <Editor bpmnXml={bpmnXml} onModelerReady={(modeler) => (modelerRef.current = modeler)} />
      ) : (
        <Viewer bpmnXml={bpmnXml} />
      )}
    </>
  );
};

const Viewer = ({ bpmnXml }: Pick<CanvasProps, 'bpmnXml'>): JSX.Element => {
  const { canvasRef } = useBpmnViewer(bpmnXml);
  return <div ref={canvasRef}></div>;
};

const Editor = ({
  bpmnXml,
  onModelerReady,
}: Pick<CanvasProps, 'bpmnXml'> & { onModelerReady: (modeler: Modeler) => void }): JSX.Element => {
  const { canvasRef, modelerRef } = useBpmnEditor(bpmnXml);

  useEffect(() => {
    onModelerReady(modelerRef.current);
  }, [modelerRef, onModelerReady]);

  return <div ref={canvasRef}></div>;
};
