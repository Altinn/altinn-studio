import React, { ReactNode } from 'react';
import classes from './Editor.module.css';
import { useBpmnEditor } from '../../../hooks/useBpmnEditor';

/**
 * @component
 *  Displays the editor canvas in the ProcessEditor
 *
 * @returns {ReactNode} - The rendered component
 */
export const Editor = (): ReactNode => {
  const { canvasRef } = useBpmnEditor();
  return <div className={classes.editorContainer} ref={canvasRef}></div>;
};
