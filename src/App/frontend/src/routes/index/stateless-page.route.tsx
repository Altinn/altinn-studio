import React from 'react';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';

export default function StatelessPage() {
  return (
    <PresentationComponent>
      <Form />
    </PresentationComponent>
  );
}
