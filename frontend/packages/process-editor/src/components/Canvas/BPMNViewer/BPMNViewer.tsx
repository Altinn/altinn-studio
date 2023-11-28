import React, { ReactNode } from 'react';
import classes from './BPMNViewer.module.css';
import { useBpmnViewer } from '../../../hooks/useBpmnViewer';
import { VersionAlert } from './VersionAlert';
import { BPMNViewerErrorAlert } from './BPMNViewerErrorAlert';
import { supportsProcessEditor } from '../../../utils/processEditorUtils';

export type BPMNViewerProps = {
  appLibVersion: string;
};

/**
 * @component
 *  Displays the canvas area of the ProcessEditor
 *
 * @property {string}[appLibVersion] - The app-lib version the user has
 *
 * @returns {ReactNode} - The rendered component
 */
export const BPMNViewer = ({ appLibVersion }: BPMNViewerProps): ReactNode => {
  const { canvasRef, bpmnViewerError } = useBpmnViewer();

  const isEditAllowed: boolean = supportsProcessEditor(appLibVersion);

  return (
    <>
      {bpmnViewerError !== undefined && <BPMNViewerErrorAlert bpmnViewerError={bpmnViewerError} />}
      <div className={classes.viewerWrapper}>
        <div className={classes.canvasContainer} ref={canvasRef}></div>
        {!isEditAllowed && <VersionAlert appLibVersion={appLibVersion} />}
      </div>
    </>
  );
};
