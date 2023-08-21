import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import React from 'react';
import { useParams } from 'react-router-dom';

export const ProcessEditor = () => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { data: bpmnXml } = useBpmnQuery(org, app);
  return <ProcessEditorImpl bpmnXml={bpmnXml} />;
};
