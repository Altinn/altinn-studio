import { ProcessEditor as ProcessEditorImpl } from '@altinn/process-editor';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import React from 'react';

export const ProcessEditor = () => {
  const { data: bpmnXml } = useBpmnQuery('org', 'app');
  return <ProcessEditorImpl bpmnXml={bpmnXml} />;
};
