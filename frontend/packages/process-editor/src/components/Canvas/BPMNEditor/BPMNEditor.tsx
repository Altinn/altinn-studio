import React from 'react';
import classes from './BPMNEditor.module.css';
import { useBpmnEditor } from '../../../hooks/useBpmnEditor';

import './BPMNEditor.css';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const BPMNEditor = (): React.ReactElement => {
  const { t } = useTranslation();
  const { canvasRef } = useBpmnEditor();
  const { pendingApiOperations } = useBpmnApiContext();

  return (
    <>
      {pendingApiOperations && (
        <div className={classes.spinner}>
          <StudioSpinner spinnerTitle={t('process_editor.loading')} />
        </div>
      )}
      <div
        className={pendingApiOperations ? classes.container : classes.editorContainer}
        ref={canvasRef}
      ></div>
    </>
  );
};
