import React, { useMemo } from 'react';

import { FatalErrorEmpty } from '@app/form-component';

import { FormStore } from 'src/features/form/FormContext';
import { useFetchOptions } from 'src/features/options/useGetOptions';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { getComponentBehaviors } from 'src/layout';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
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
  const bindings = useDataModelBindingsFor(baseComponentId);
  // Attachment options label tags, rather than values stored in the simple binding.
  const selectionBinding =
    !getComponentBehaviors(config.type).canHaveAttachments && bindings && 'simpleBinding' in bindings
      ? bindings.simpleBinding
      : undefined;
  const valueBindings = useMemo(
    () => (selectionBinding ? { simpleBinding: selectionBinding } : undefined),
    [selectionBinding],
  );
  const rawSelection = FormStore.data.useFreshBindings(valueBindings, 'string').simpleBinding;
  const hasSelection = !selectionBinding || (rawSelection != null && rawSelection !== '');
  const { error } = useFetchOptions({ config });
  return error && hasSelection ? <FatalErrorEmpty /> : null;
}
