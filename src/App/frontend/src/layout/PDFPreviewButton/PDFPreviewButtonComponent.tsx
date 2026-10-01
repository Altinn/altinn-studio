import React, { useEffect } from 'react';

import { PDFPreviewButton } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import type { PropsFromGenericComponent } from '..';

import { FormStore } from 'src/features/form/FormContext';
import { useLaxInstanceId, useStrictInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import { generatePdfPreview } from 'src/utils/pdfPreview/generatePdfPreview';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

export function PDFPreviewButtonRenderLayoutValidator({
  externalItem,
}: ComponentLayoutValidationProps<'PDFPreviewButton'>) {
  const instanceId = useStrictInstanceId();
  const addError = FormStore.layoutDiagnostics.useAddError();

  useEffect(() => {
    if (!instanceId) {
      const error = `Cannot use PDF preview button in a stateless app`;
      addError(error, externalItem.id, 'node');
      window.logErrorOnce(`Validation error for '${externalItem.id}': ${error}`);
    }
  }, [addError, instanceId, externalItem.id]);

  return null;
}

export function PDFPreviewButtonComponent({ baseComponentId }: PropsFromGenericComponent<'PDFPreviewButton'>) {
  const config = useComponentConfig(baseComponentId, 'PDFPreviewButton');
  const componentId = useIndexedId(baseComponentId);
  const title = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.PDFPreviewButton.textResourceBindings.title,
  );

  const { innerGrid } = useComponentStructureData(baseComponentId);
  const instanceId = useLaxInstanceId();
  const language = useCurrentLanguage();

  return (
    <PDFPreviewButton
      componentId={componentId}
      title={title}
      buttonStyle={config.buttonStyle}
      disabled={!instanceId}
      onGenerate={(signal) => generatePdfPreview(instanceId, language, signal)}
      innerGrid={innerGrid}
    />
  );
}
