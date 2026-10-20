import React from 'react';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import classes from './Canvas.module.css';
import { BPMNEditor } from './BPMNEditor';

export const Canvas = (): React.ReactElement => {
  return (
    <div className={classes.wrapper}>
      <BPMNEditor />
    </div>
  );
};
