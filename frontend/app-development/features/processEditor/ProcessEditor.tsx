import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useBpmnMutation } from 'app-development/hooks/mutations';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import React from 'react';
import { useParams } from 'react-router-dom';

export const ProcessEditor = () => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { data: bpmnXml, isError: hasBpmnQueryError } = useBpmnQuery(org, app);

  const bpmnMutation = useBpmnMutation();

  const saveBpmnXml = async (xml: string): Promise<void> => {
    await bpmnMutation.mutateAsync(
      { org, app, bpmnXml: xml },
      {
        onSuccess: () => {
          // TODO show success toast when issue #10735 is resolved
          alert('Bpmn saved successfully');
        },
        onError: () => {
          // TODO show error toast when issue #10735 is resolved
          alert('Failed to save bpmn');
        },
      }
    );
  };

  // TODO: Handle error will be handled better after issue #10735 is resolved
  return <ProcessEditorImpl bpmnXml={hasBpmnQueryError ? null : bpmnXml} onSave={saveBpmnXml} />;
};
