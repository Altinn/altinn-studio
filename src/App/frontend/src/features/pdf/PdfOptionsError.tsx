import React from 'react';

import { FatalErrorEmpty } from '@app/form-component';

import { useFetchOptions } from 'src/features/options/useGetOptions';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { getComponentBehaviors } from 'src/layout';
import { useComponentConfig } from 'src/utils/layout/hooks';
import type { CompWithBehavior } from 'src/layout/layout';

/** Block printing when options for a rendered PDF field could not be loaded. */
export function PdfOptionsError({ baseComponentId }: { baseComponentId: string }) {
  const pdfMode = usePdfModeActive();
  const config = useComponentConfig(baseComponentId);
  return pdfMode && getComponentBehaviors(config.type).canHaveOptions ? (
    <OptionsError baseComponentId={baseComponentId} />
  ) : null;
}

function OptionsError({ baseComponentId }: { baseComponentId: string }) {
  const config = useComponentConfig<CompWithBehavior<'canHaveOptions'>>(
    baseComponentId,
    (type) => getComponentBehaviors(type).canHaveOptions,
  );
  const { error } = useFetchOptions({ config });
  return error ? <FatalErrorEmpty /> : null;
}
