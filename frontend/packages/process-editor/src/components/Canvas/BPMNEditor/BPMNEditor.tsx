import type { ReactNode } from 'react';
import React from 'react';
import classes from './BPMNEditor.module.css';
import { useBpmnEditor } from '../../../hooks/useBpmnEditor';

import './BPMNEditor.css'; // used to override bpmn-js styles

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
