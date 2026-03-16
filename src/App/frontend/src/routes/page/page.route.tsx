import React from 'react';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { PdfWrapper } from 'src/features/pdf/PdfWrapper';

export function Component() {
  return (
    <PdfWrapper>
      <PresentationComponent>
        <Form />
      </PresentationComponent>
    </PdfWrapper>
  );
}
