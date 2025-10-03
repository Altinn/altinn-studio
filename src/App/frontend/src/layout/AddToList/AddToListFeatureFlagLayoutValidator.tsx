import { useEffect } from 'react';

import { getFeature } from 'src/features/toggles';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { NodeValidationProps } from 'src/layout/layout';

export function AddToListFeatureFlagLayoutValidator({ intermediateItem }: NodeValidationProps<'AddToList'>) {
  const addToListEnabled = getFeature('addToListEnabled');
  const addError = NodesInternal.useAddError();

  useEffect(() => {
    if (!addToListEnabled.value) {
      const error = `You need to enable the feature flag addToListEnabled to use this component. Please note that the component is experimental
    and the configuration is likely to change.`;
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }
  }, [addError, addToListEnabled.value, intermediateItem.id]);

  return null;
}
