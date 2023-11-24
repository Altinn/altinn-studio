import React, { ReactNode } from 'react';
import classes from './Viewer.module.css';
import { useBpmnViewer } from '../../../hooks/useBpmnViewer';
import { VersionAlert } from './VersionAlert';
import { ViewerErrorAlert } from './ViewerErrorAlert';
import { getIfVersionIs8OrNewer } from '../../../utils/processEditorUtils';

export type ViewerProps = {
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
export const Viewer = ({ appLibVersion }: ViewerProps): ReactNode => {
  const { canvasRef, bpmnViewerError } = useBpmnViewer();

  const isEditAllowed: boolean = getIfVersionIs8OrNewer(appLibVersion);

  return (
    <>
      {bpmnViewerError !== undefined && <ViewerErrorAlert bpmnViewerError={bpmnViewerError} />}
      <div className={classes.viewerWrapper}>
        <div className={classes.canvasContainer} ref={canvasRef}></div>
        {!isEditAllowed && <VersionAlert appLibVersion={appLibVersion} />}
      </div>
    </>
  );
};
