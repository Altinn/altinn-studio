import React from 'react';

import { PDFPreviewControls } from '@app/form-component';

import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { generatePdfPreview } from 'src/utils/pdfPreview/generatePdfPreview';
import type { PdfPreviewTarget } from 'src/utils/urls/appUrlHelper';

export function PDFGeneratorPreview({
  buttonTitle,
  showErrorDetails,
  target,
  disabled,
}: {
  buttonTitle?: string;
  showErrorDetails?: boolean;
  target?: PdfPreviewTarget;
  disabled?: boolean;
}) {
  const instanceId = useLaxInstanceId();
  const language = useCurrentLanguage();
  const { langAsString } = useLanguage();

  return (
    <PDFPreviewControls
      title={buttonTitle ? langAsString(buttonTitle) : langAsString('pdfPreview.defaultButtonText')}
      errorHeading={langAsString('pdfPreview.error')}
      loadingLabel={langAsString('general.loading')}
      disabled={!instanceId || disabled}
      showErrorDetails={showErrorDetails}
      onGenerate={(signal) => generatePdfPreview(instanceId, language, signal, target)}
    />
  );
}
