import React, { useState } from 'react';
import { StudioToggleableTextfieldSchema, type SchemaValidationError } from '@studio/components';
import { Alert } from '@digdir/designsystemet-react';
import classes from './EditComponentIdRow.module.css';
import { idExists } from '../../../../utils/formLayoutsUtils';
import { useTranslation } from 'react-i18next';
import type { FormItem } from '../../../../types/FormItem';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { useFormLayouts } from '../../../../hooks';
import { findLayoutsContainingDuplicateComponents } from '../../../../utils/formLayoutUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';

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
  const [{ data: layoutSchema }, , { data: expressionSchema }, { data: numberFormatSchema }] =
    useLayoutSchemaQuery();

  const { org, app } = useStudioEnvironmentParams();
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const [isViewMode, setIsViewMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(null);

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
    if (
      component.type === ComponentType.FileUpload ||
      component.type === ComponentType.FileUploadWithTag
    ) {
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
    return '';
  };

  const handleValidationError = (error: SchemaValidationError | null): void => {
    const errorCodeMap = {
      required: t('validation_errors.required'),
      unique: t('ux_editor.modal_properties_component_id_not_unique_error'),
      pattern: t('ux_editor.modal_properties_component_id_not_valid'),
    };
    setErrorMessage(errorCodeMap[error?.errorCode]);
  };

  return (
    <div className={duplicatedId ? classes.duplicatedIdField : classes.container}>
      <StudioToggleableTextfieldSchema
        customValidation={(value) => {
          return validateId(value);
        }}
        error={errorMessage}
        key={component.id}
        label={t('ux_editor.modal_properties_component_change_id')}
        layoutSchema={layoutSchema}
        onBlur={(event) => saveComponentUpdate(event.target.value)}
        onError={handleValidationError}
        onIsViewMode={setIsViewMode}
        propertyPath='definitions/component/properties/id'
        relatedSchemas={[expressionSchema, numberFormatSchema]}
        title={component.id}
        value={component.id}
      />
      {!isViewMode && (
        <div className={classes.alert}>
          <Alert size='small'>
            {t('ux_editor.modal_properties_component_change_id_information')}
          </Alert>
        </div>
      )}
    </div>
  );
};
