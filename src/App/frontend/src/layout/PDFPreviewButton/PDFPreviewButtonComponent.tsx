import React, { useEffect } from 'react';

import type { PropsFromGenericComponent } from '..';

import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useStrictInstanceId } from 'src/features/instance/InstanceContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { appSupportsPdfPreviewButton, FEATURE_VERSION_MAP } from 'src/utils/versioning/versions';
import type { NodeValidationProps } from 'src/layout/layout';

export function PDFPreviewButtonRenderLayoutValidator({ intermediateItem }: NodeValidationProps<'PDFPreviewButton'>) {
  const instanceId = useStrictInstanceId();
  const addError = NodesInternal.useAddError();
  const applicationMetadata = useApplicationMetadata();
  const isPdfPreviewButtonSupported = appSupportsPdfPreviewButton(applicationMetadata.altinnNugetVersion);

  useEffect(() => {
    if (!isPdfPreviewButtonSupported) {
      const error = `Need to be on at least backend version: ${FEATURE_VERSION_MAP.PDF_PREVIEW_BUTTON} to use this component`;
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }

    if (!instanceId) {
      const error = `Cannot use PDF preview button in a stateless app`;
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }
  }, [addError, isPdfPreviewButtonSupported, instanceId, intermediateItem.id]);

  return null;
}

export function PDFPreviewButtonComponent({ baseComponentId }: PropsFromGenericComponent<'PDFPreviewButton'>) {
  const { textResourceBindings } = useItemWhenType(baseComponentId, 'PDFPreviewButton');
  return <PDFGeneratorPreview buttonTitle={textResourceBindings?.title} />;
}
