import { useEffect } from 'react';

import { useSaveDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediate, CompWithBehavior } from 'src/layout/layout';

export function EffectSetDownstreamParameters({ downstreamParameters }: { downstreamParameters: string | undefined }) {
  const item = GeneratorInternal.useIntermediateItem() as CompIntermediate<CompWithBehavior<'canHaveOptions'>>;
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
