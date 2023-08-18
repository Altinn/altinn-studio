import React from 'react';

type ProcessEditorProps = {
  bpmnXml: string | undefined | null;
};
export const ProcessEditor = ({ bpmnXml }: ProcessEditorProps): JSX.Element => {
  if (bpmnXml === undefined) {
    return <div>Loading Bpmn XML</div>;
  }

  if (bpmnXml === null) {
    return <div>No Bpmn XML was found during loading</div>;
  }

  return <div>Process Editor</div>;
};
