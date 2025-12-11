import { useEffect } from 'react';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useDataTypeFromLayoutSet } from 'src/features/form/layout/LayoutsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { NodeValidationProps } from 'src/layout/layout';

export function SubformValidator(props: NodeValidationProps<'Subform'>) {
  const { intermediateItem, externalItem } = props;
  const { langAsString } = useLanguage();
  const applicationMetadata = useApplicationMetadata();

  const targetType = useDataTypeFromLayoutSet(externalItem.layoutSet);
  const dataType = applicationMetadata.dataTypes.find(
    (x) => x.id.toLocaleLowerCase() === targetType?.toLocaleLowerCase(),
  );

  const addError = NodesInternal.useAddError();

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
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }
  }, [addError, dataType, externalItem, langAsString, intermediateItem.id, targetType]);

  return null;
}
