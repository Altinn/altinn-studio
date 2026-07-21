import { useEffect } from 'react';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { FormStore } from 'src/features/form/FormContext';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui';
import { useLanguage } from 'src/features/language/useLanguage';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

export function SubformValidator(props: ComponentLayoutValidationProps<'Subform'>) {
  const { externalItem } = props;
  const { langAsString } = useLanguage();
  const applicationMetadata = getApplicationMetadata();

  const targetType = getDefaultDataTypeFromUiFolder(externalItem.layoutSet);
  const dataType = applicationMetadata.dataTypes.find(
    (x) => x.id.toLocaleLowerCase() === targetType?.toLocaleLowerCase(),
  );

  const addError = FormStore.layoutDiagnostics.useAddError();

  useEffect(() => {
    let error: string | null = null;

    if (targetType === undefined) {
      error = langAsString('config_error.subform_no_datatype_layoutset');
    } else if (dataType === undefined) {
      error = langAsString('config_error.subform_no_datatype_appmetadata', [targetType]);
    } else if (dataType.appLogic?.disallowUserCreate === true && externalItem.showAddButton !== false) {
      error = langAsString('config_error.subform_misconfigured_add_button', [targetType]);
    }

    if (error) {
      addError(error, externalItem.id, 'node');
      window.logErrorOnce(`Validation error for '${externalItem.id}': ${error}`);
    }
  }, [addError, dataType, externalItem, langAsString, targetType]);

  return null;
}
