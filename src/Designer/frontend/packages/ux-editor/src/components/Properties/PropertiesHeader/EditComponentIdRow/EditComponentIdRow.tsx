import { useState } from 'react';
import { StudioAlert, StudioToggleableTextfield } from '@studio/components';
import classes from './EditComponentIdRow.module.css';
import { idExists } from '../../../../utils/formLayoutsUtils';
import { useTranslation } from 'react-i18next';
import type { FormItem } from '../../../../types/FormItem';
import { useFormLayouts } from '../../../../hooks';
import { findLayoutsContainingDuplicateComponents } from '../../../../utils/formLayoutUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { getComponentDefinition, validateCatalogValue } from '../../../../data/componentCatalog';

export interface EditComponentIdRowProps {
  handleComponentUpdate: (component: FormItem) => void;
  component: FormItem;
  helpText?: string;
}

export const EditComponentIdRow = ({
  component,
  handleComponentUpdate,
}: EditComponentIdRowProps) => {
  const formLayouts = useFormLayouts();
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const [isViewMode, setIsViewMode] = useState(true);

  const idInputValue = component.id;

  const layoutsWithDuplicateComponents = findLayoutsContainingDuplicateComponents(formLayouts);
  const duplicatedId = layoutsWithDuplicateComponents.duplicateComponents.includes(idInputValue);

  const saveComponentUpdate = (id: string) => {
    if (id !== idInputValue) {
      handleComponentUpdate({
        ...component,
        id,
      });
    }
  };

  const dataTypeWithNameExists = (id: string) => {
    if (component.type === ComponentType.FileUpload) {
      return appMetadata.dataTypes?.find(
        (dataType) => dataType.id.toLowerCase() === id.toLowerCase(),
      );
    }
  };

  const validateId = (value: string) => {
    if (value?.length === 0) {
      return t('validation_errors.required');
    }
    if (value.toLowerCase() !== component.id.toLowerCase()) {
      if (idExists(value, formLayouts)) {
        return t('ux_editor.modal_properties_component_id_not_unique_error');
      }
      if (dataTypeWithNameExists(value)) {
        return t('ux_editor.error_component_id_exists_as_data_type');
      }
    }
    const validationError = validateCatalogValue(
      getComponentDefinition(component.type)?.properties.id,
      value,
    );
    if (validationError === 'pattern') {
      return t('ux_editor.modal_properties_component_id_not_valid');
    }
    return '';
  };

  return (
    <div className={duplicatedId ? classes.duplicatedIdField : classes.container}>
      <StudioToggleableTextfield
        customValidation={(value) => {
          return validateId(value);
        }}
        key={component.id}
        label={t('ux_editor.modal_properties_component_change_id')}
        onBlur={(event) => saveComponentUpdate(event.target.value)}
        onIsViewMode={setIsViewMode}
        title={component.id}
        value={component.id}
      />
      {!isViewMode && (
        <div className={classes.alert}>
          <StudioAlert data-size='sm'>
            {t('ux_editor.modal_properties_component_change_id_information')}
          </StudioAlert>
        </div>
      )}
    </div>
  );
};
