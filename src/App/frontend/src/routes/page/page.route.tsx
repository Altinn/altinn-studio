import React from 'react';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { WorkflowTroubleBanner } from 'src/components/process/WorkflowEngine';

export default function Page() {
  return (
    <PresentationComponent>
      <WorkflowTroubleBanner />
      <Form />
    </PresentationComponent>
  );
}
