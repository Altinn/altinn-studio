import React from 'react';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import classes from './Canvas.module.css';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { BPMNEditor } from './BPMNEditor';
import { CanvasActionMenu } from './CanvasActionMenu';

export type CanvasProps = {
  onSave: (bpmnXml: string) => void;
};

/**
 * @component
 *  Displays the canvas area of the ProcessEditor
 *
 * @property {function}[onSave] - Function to be executed when saving the canvas
 * @property {string}[appLibVersion] - The app-lib version the user has
 *
 * @returns {JSX.Element} - The rendered component
 */
export const Canvas = ({ onSave }: CanvasProps): JSX.Element => {
  const { getUpdatedXml, isEditAllowed } = useBpmnContext();

  const handleOnSave = async (): Promise<void> => {
    onSave(await getUpdatedXml());
  };

  return (
    <div className={classes.container}>
      {isEditAllowed && <CanvasActionMenu onSave={handleOnSave} />}
      <div className={classes.wrapper}>{<BPMNEditor />}</div>
    </div>
  );
};
