import React from 'react';
import classes from './BPMNViewer.module.css';
import { useBpmnViewer } from '../../../hooks/useBpmnViewer';
import { BPMNViewerErrorAlert } from './BPMNViewerErrorAlert';

/**
 * @component
 *  Displays the canvas area of the ProcessEditor
 *
 * @returns {JSX.Element} - The rendered component
 */
export const BPMNViewer = (): JSX.Element => {
  const { canvasRef, bpmnViewerError } = useBpmnViewer();

  return (
    <>
      {bpmnViewerError !== undefined && <BPMNViewerErrorAlert bpmnViewerError={bpmnViewerError} />}
      <div className={classes.viewerWrapper}>
        <div className={classes.canvasContainer} ref={canvasRef}></div>
      </div>
    </>
  );
};
