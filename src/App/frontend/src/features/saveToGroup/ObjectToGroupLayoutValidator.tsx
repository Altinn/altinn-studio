import { useEffect } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { useLanguage } from 'src/features/language/useLanguage';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

export function ObjectToGroupLayoutValidator(
  props: ComponentLayoutValidationProps<'List' | 'Checkboxes' | 'MultipleSelect'>,
) {
  const { externalItem } = props;
  const { langAsString } = useLanguage();
  const group = externalItem.dataModelBindings?.group;
  const deletionStrategy = externalItem.deletionStrategy;
  const checkedBinding = externalItem.dataModelBindings?.checked;

  const addError = FormStore.layoutDiagnostics.useAddError();

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
      addError(error, externalItem.id, 'node');
      window.logErrorOnce(`Validation error for '${externalItem.id}': ${error}`);
    }
  }, [addError, externalItem.id, deletionStrategy, checkedBinding, langAsString, group]);

  return null;
}
