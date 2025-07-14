import React, { useEffect } from 'react';

import type { PropsFromGenericComponent } from '..';

import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useStrictInstanceId } from 'src/features/instance/InstanceContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { isAtLeastVersion } from 'src/utils/versionCompare';
import type { NodeValidationProps } from 'src/layout/layout';

export function PDFPreviewButtonRenderLayoutValidator({ intermediateItem }: NodeValidationProps<'PDFPreviewButton'>) {
  const instanceId = useStrictInstanceId();
  const addError = NodesInternal.useAddError();
  const applicationMetadata = useApplicationMetadata();
  const minimumBackendVersion = '8.5.0.157';
  const backendVersionOK = isAtLeastVersion({
    actualVersion: applicationMetadata.altinnNugetVersion ?? '',
    minimumVersion: minimumBackendVersion,
  });

  useEffect(() => {
    if (!backendVersionOK) {
      const error = `Need to be on at least backend version: ${minimumBackendVersion} to user this component`;
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }

    if (!instanceId) {
      const error = `Cannot use PDF preview button in a stateless app`;
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }
  }, [addError, backendVersionOK, instanceId, intermediateItem.id]);

  return null;
}

export function PDFPreviewButtonComponent({ baseComponentId }: PropsFromGenericComponent<'PDFPreviewButton'>) {
  const { textResourceBindings } = useItemWhenType(baseComponentId, 'PDFPreviewButton');
  return <PDFGeneratorPreview buttonTitle={textResourceBindings?.title} />;
}
