import React from 'react';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { WorkflowTroubleBanner } from 'src/components/process/WorkflowEngine';
import { PdfWrapper } from 'src/features/pdf/PdfWrapper';

export default function Page() {
  return (
    <PdfWrapper>
      <PresentationComponent>
        {/* A page shows while a workflow is processing only when it is a service task's own page. */}
        <WorkflowTroubleBanner />
        <Form />
      </PresentationComponent>
    </PdfWrapper>
  );
}
