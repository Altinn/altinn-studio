import React, { useEffect } from 'react';

import type { PropsFromGenericComponent } from '..';

import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import { FormStore } from 'src/features/form/FormContext';
import { useStrictInstanceId } from 'src/features/instance/InstanceContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { NodeValidationProps } from 'src/layout/layout';

export function PDFPreviewButtonRenderLayoutValidator({ intermediateItem }: NodeValidationProps<'PDFPreviewButton'>) {
  const instanceId = useStrictInstanceId();
  const addError = FormStore.nodes.useAddError();

  useEffect(() => {
    if (!instanceId) {
      const error = `Cannot use PDF preview button in a stateless app`;
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }
  }, [addError, instanceId, intermediateItem.id]);

  return null;
}

export function PDFPreviewButtonComponent({ baseComponentId }: PropsFromGenericComponent<'PDFPreviewButton'>) {
  const { textResourceBindings } = useItemWhenType(baseComponentId, 'PDFPreviewButton');
  return <PDFGeneratorPreview buttonTitle={textResourceBindings?.title} />;
}
