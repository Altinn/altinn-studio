import React from 'react';

import { PDFPreviewControls } from '@app/form-component';

import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { generatePdfPreview } from 'src/utils/pdfPreview/generatePdfPreview';

export function PDFGeneratorPreview({
  buttonTitle,
  showErrorDetails,
}: {
  buttonTitle?: string;
  showErrorDetails?: boolean;
}) {
  const instanceId = useLaxInstanceId();
  const language = useCurrentLanguage();

  return (
    <PDFPreviewControls
      title={buttonTitle}
      disabled={!instanceId}
      showErrorDetails={showErrorDetails}
      onGenerate={(signal) => generatePdfPreview(instanceId, language, signal)}
    />
  );
}
