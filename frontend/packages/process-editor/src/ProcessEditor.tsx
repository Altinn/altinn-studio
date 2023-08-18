import React from 'react';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { PageLoading } from './components/PageLoading';

type ProcessEditorProps = {
  bpmnXml: string | undefined | null;
};
export const ProcessEditor = ({ bpmnXml }: ProcessEditorProps): JSX.Element => {
  if (bpmnXml === undefined) {
    return <PageLoading title='Retrieving your BPMN file' />;
  }

  if (bpmnXml === null) {
    return (
      <Alert severity='danger' style={{ height: 'min-content' }}>
        <Heading size='medium' level={2}>
          Something went wrong
        </Heading>
        <Paragraph>
          The BPMN file you're looking for could not be found. You might want to consider refreshing
          the page to attempting to refetch the BPMN file.
        </Paragraph>
      </Alert>
    );
  }

  return <div>Process Editor</div>;
};
