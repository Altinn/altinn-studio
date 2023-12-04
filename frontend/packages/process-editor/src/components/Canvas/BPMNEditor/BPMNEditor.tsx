import React, { ReactNode } from 'react';
import classes from './BPMNEditor.module.css';
import { useBpmnEditor } from '../../../hooks/useBpmnEditor';

/**
 * @component
 *  Displays the editor canvas in the ProcessEditor
 *
 * @returns {ReactNode} - The rendered component
 */
export const BPMNEditor = (): ReactNode => {
  const { canvasRef } = useBpmnEditor();
  return <div className={classes.editorContainer} ref={canvasRef}></div>;
};
