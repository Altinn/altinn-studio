import type { ReactNode } from 'react';
import React from 'react';
import classes from './BPMNEditor.module.css';
import { useBpmnEditor } from '../../../hooks/useBpmnEditor';

import './BPMNEditor.css';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext'; // used to override bpmn-js styles
import { StudioSpinner } from '@studio/components';

/**
 * @component
 *  Displays the editor canvas in the ProcessEditor
 *
 * @returns {ReactNode} - The rendered component
 */
export const BPMNEditor = (): ReactNode => {
  const { canvasRef } = useBpmnEditor();
  const { pendingLayoutSetOperations } = useBpmnApiContext();

  return (
    <>
      {pendingLayoutSetOperations && (
        <div className={classes.spinner}>
          <StudioSpinner spinnerTitle={'process_editor.loading'} />
        </div>
      )}
      <div
        className={pendingLayoutSetOperations ? classes.container : classes.editorContainer}
        ref={canvasRef}
      ></div>
    </>
  );
};
