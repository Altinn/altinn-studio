import React from 'react';

import { PDFPreviewControls } from '@app/form-component';

import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
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
  const { langAsString } = useLanguage();

  return (
    <PDFPreviewControls
      title={buttonTitle ? langAsString(buttonTitle) : langAsString('pdfPreview.defaultButtonText')}
      errorHeading={langAsString('pdfPreview.error')}
      loadingLabel={langAsString('general.loading')}
      disabled={!instanceId}
      showErrorDetails={showErrorDetails}
      onGenerate={(signal) => generatePdfPreview(instanceId, language, signal)}
    />
  );
}
