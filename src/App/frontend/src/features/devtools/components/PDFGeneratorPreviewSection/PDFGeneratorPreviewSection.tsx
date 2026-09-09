import React from 'react';

import { Fieldset } from '@digdir/designsystemet-react';

import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import { isStudioPreview } from 'src/utils/isDev';

export const PDFGeneratorPreviewSection = () => (
  <Fieldset>
    <Fieldset.Legend>Forhåndsvis PDF</Fieldset.Legend>
    {/* PDF generator is not available in altinn studio preview */}
    {!isStudioPreview() && (
      <PDFGeneratorPreview
        showErrorDetails={true}
        buttonTitle='Generer PDF'
      />
    )}
  </Fieldset>
);
