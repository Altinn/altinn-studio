import { useEffect } from 'react';

import type { IDataModelBindingsOptionsSimple } from '@app/layout-contract/generated/common.generated';

import { useSaveDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';

export function EffectSetDownstreamParameters({
  baseComponentId,
  downstreamParameters,
}: {
  baseComponentId: string;
  downstreamParameters: string | undefined;
}) {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId) as IDataModelBindingsOptionsSimple | undefined;
  const { setValue } = useSaveDataModelBindings(dataModelBindings);

  useEffect(() => {
    if (dataModelBindings && 'metadata' in dataModelBindings && dataModelBindings.metadata && downstreamParameters) {
      // The value might be url-encoded
      setValue('metadata', decodeURIComponent(downstreamParameters));
    }
  }, [dataModelBindings, downstreamParameters, setValue]);

  return null;
}
