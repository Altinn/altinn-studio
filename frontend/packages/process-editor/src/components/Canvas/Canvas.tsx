import React from 'react';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import classes from './Canvas.module.css';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { BPMNViewer } from './BPMNViewer';
import { BPMNEditor } from './BPMNEditor';
import { VersionHelpText } from './VersionHelpText';

export const Canvas = (): React.ReactElement => {
  const { isEditAllowed, bpmnXml } = useBpmnContext();

  return (
    <>
      {!isEditAllowed && <VersionHelpText />}
      <div className={classes.wrapper} key={bpmnXml}>
        {isEditAllowed ? <BPMNEditor /> : <BPMNViewer />}
      </div>
    </>
  );
};
