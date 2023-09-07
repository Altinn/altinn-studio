import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useBpmnMutation } from 'app-development/hooks/mutations';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import React from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

export const ProcessEditor = () => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { data: bpmnXml, isError: hasBpmnQueryError } = useBpmnQuery(org, app);

  const bpmnMutation = useBpmnMutation(org, app);

  const saveBpmnXml = async (xml: string): Promise<void> => {
    await bpmnMutation.mutateAsync(
      { bpmnXml: xml },
      {
        onSuccess: () => {
          toast.success('Bpmn saved successfully');
        },
      }
    );
  };

  // TODO: Handle error will be handled better after issue #10735 is resolved
  return <ProcessEditorImpl bpmnXml={hasBpmnQueryError ? null : bpmnXml} onSave={saveBpmnXml} />;
};
