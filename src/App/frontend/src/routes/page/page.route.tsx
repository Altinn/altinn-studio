import React from 'react';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { WorkflowTroubleBanner } from 'src/components/process/WorkflowEngine';
import { PdfWrapper } from 'src/features/pdf/PdfWrapper';

export default function Page() {
  return (
    <PdfWrapper>
      <PresentationComponent>
        <WorkflowTroubleBanner />
        <Form />
      </PresentationComponent>
    </PdfWrapper>
  );
}
