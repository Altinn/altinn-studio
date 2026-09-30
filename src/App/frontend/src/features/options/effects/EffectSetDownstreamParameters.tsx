import { useEffect } from 'react';

import type { IDataModelBindingsOptionsSimple } from '@app/layout-contract/generated/common.generated';

import { useSaveDataModelBindings } from 'src/features/formData/useDataModelBindings';
import type { CompIntermediate, CompWithBehavior } from 'src/layout/layout';

export function EffectSetDownstreamParameters({
  item,
  downstreamParameters,
}: {
  item: CompIntermediate<CompWithBehavior<'canHaveOptions'>>;
  downstreamParameters: string | undefined;
}) {
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;
  const { setValue } = useSaveDataModelBindings(dataModelBindings);

  useEffect(() => {
    if (dataModelBindings && 'metadata' in dataModelBindings && dataModelBindings.metadata && downstreamParameters) {
      // The value might be url-encoded
      setValue('metadata', decodeURIComponent(downstreamParameters));
    }
  }, [dataModelBindings, downstreamParameters, setValue]);

  return null;
}
