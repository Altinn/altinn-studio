import { useEffect } from 'react';

import { useSaveDataModelBindings } from 'src/features/formData/useDataModelBindings';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
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
