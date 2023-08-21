import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useBpmnMutation } from 'app-development/hooks/mutations';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import React from 'react';
import { useParams } from 'react-router-dom';

export const ProcessEditor = () => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { data: bpmnXml } = useBpmnQuery(org, app);

  const bpmnMutation = useBpmnMutation();

  const saveBpmnXml = async (xml: string): Promise<void> => {
    await bpmnMutation.mutateAsync({ org, app, bpmnXml: xml });
  }

  return <ProcessEditorImpl bpmnXml={bpmnXml} onSave={saveBpmnXml} />;
};
