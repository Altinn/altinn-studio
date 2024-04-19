import type { ReactNode } from 'react';
import React from 'react';
import classes from './BPMNEditor.module.css';
import { useBpmnEditor } from '../../../hooks/useBpmnEditor';

import './BPMNEditor.css';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

/**
 * @component
 *  Displays the editor canvas in the ProcessEditor
 *
 * @returns {ReactNode} - The rendered component
 */
export const BPMNEditor = (): ReactNode => {
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
