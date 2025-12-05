import React, { useEffect } from 'react';

import type { PropsFromGenericComponent } from '..';

import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import { useStrictInstanceId } from 'src/domain/Instance/useInstanceQuery';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { NodeValidationProps } from 'src/layout/layout';

export function PDFPreviewButtonRenderLayoutValidator({ intermediateItem }: NodeValidationProps<'PDFPreviewButton'>) {
  const instanceId = useStrictInstanceId();
  const addError = NodesInternal.useAddError();

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
