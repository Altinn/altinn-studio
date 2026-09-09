import React from 'react';

import { PresentationComponent } from 'src/components/presentation/Presentation';
import { FixWrongReceiptType } from 'src/features/receipt/FixWrongReceiptType';
import { ReceiptContainer } from 'src/features/receipt/ReceiptContainer';

export default function ProcessEnd() {
  return (
    <FixWrongReceiptType>
      <PresentationComponent showNavigation={false}>
        <ReceiptContainer />
      </PresentationComponent>
    </FixWrongReceiptType>
  );
}
