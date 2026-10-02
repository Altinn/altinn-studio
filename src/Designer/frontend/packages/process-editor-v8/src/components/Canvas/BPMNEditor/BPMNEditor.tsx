import React from 'react';
import classes from './BPMNEditor.module.css';
import { useBpmnEditor } from '../../../hooks/useBpmnEditor';
import './BPMNEditor.css';

export const BPMNEditor = (): React.ReactElement => {
  const canvasRef = useBpmnEditor();

  return <div className={classes.editorContainer} ref={canvasRef} />;
};
