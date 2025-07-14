import { useEffect } from 'react';

import { useLanguage } from 'src/features/language/useLanguage';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { NodeValidationProps } from 'src/layout/layout';

export function ObjectToGroupLayoutValidator(props: NodeValidationProps<'List' | 'Checkboxes' | 'MultipleSelect'>) {
  const { intermediateItem, externalItem } = props;
  const { langAsString } = useLanguage();
  const group = externalItem.dataModelBindings?.group;
  const deletionStrategy = externalItem.deletionStrategy;
  const checkedBinding = externalItem.dataModelBindings?.checked;

  const addError = NodesInternal.useAddError();

  useEffect(() => {
    let error: string | null = null;

    if (!group) {
      if (!!deletionStrategy || !!checkedBinding) {
        error = langAsString('config_error.deletion_strategy_no_group');
      }
    } else if (group) {
      if (!deletionStrategy) {
        error = langAsString('config_error.group_no_deletion_strategy');
      }
      if (deletionStrategy === 'soft' && !checkedBinding) {
        error = langAsString('config_error.soft_delete_no_checked');
      }
      if (deletionStrategy === 'hard' && !!checkedBinding) {
        error = langAsString('config_error.hard_delete_with_checked');
      }
    }

    if (error) {
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }
  }, [addError, intermediateItem.id, deletionStrategy, checkedBinding, langAsString, group]);

  return null;
}
