import React from 'react';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import classes from './Canvas.module.css';
import { BPMNEditor } from './BPMNEditor';
import { FiksArkivFlowLabels } from './FiksArkivFlowLabels';

export const Canvas = (): React.ReactElement => {
  return (
    <div className={classes.wrapper}>
      <BPMNEditor />
      <FiksArkivFlowLabels />
    </div>
  );
};
