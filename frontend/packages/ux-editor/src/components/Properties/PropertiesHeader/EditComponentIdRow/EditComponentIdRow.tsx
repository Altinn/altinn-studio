import React, { useState } from 'react';
import { StudioToggleableTextfieldSchema, type SchemaValidationError } from '@studio/components';
import { Alert } from '@digdir/design-system-react';
import { KeyVerticalIcon } from '@studio/icons';
import classes from './EditComponentIdRow.module.css';
import { idExists } from '../../../../utils/formLayoutsUtils';
import { Trans, useTranslation } from 'react-i18next';
import type { FormItem } from '../../../../types/FormItem';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { useFormLayouts } from '../../../../hooks';

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

  const [isViewMode, setIsViewMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(null);

  const idInputValue = component.id;

  const saveComponentUpdate = (id: string) => {
    if (id !== idInputValue) {
      handleComponentUpdate({
        ...component,
        id,
      });
    }
  };

  const validateId = (value: string) => {
    if (value?.length === 0) {
      return t('validation_errors.required');
    }
    if (value !== component.id && idExists(value, formLayouts)) {
      return t('ux_editor.modal_properties_component_id_not_unique_error');
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
    <div className={classes.container}>
      <StudioToggleableTextfieldSchema
        onError={handleValidationError}
        layoutSchema={layoutSchema}
        relatedSchemas={[expressionSchema, numberFormatSchema]}
        propertyPath='definitions/component/properties/id'
        key={component.id}
        viewProps={{
          children: <Trans i18nKey={'ux_editor.id_identifier'} values={{ item: component.id }} />,
          variant: 'tertiary',
          fullWidth: true,
          className: classes.componentIdViewMode,
        }}
        inputProps={{
          icon: <KeyVerticalIcon />,
          value: idInputValue,
          onBlur: (event) => saveComponentUpdate(event.target.value),
          label: t('ux_editor.modal_properties_component_change_id'),
          size: 'small',
          error: errorMessage,
          className: classes.idInput,
        }}
        customValidation={(value) => {
          return validateId(value);
        }}
        onIsViewMode={setIsViewMode}
      />
      {!isViewMode && (
        <div className={classes.alert}>
          <Alert>{t('ux_editor.modal_properties_component_change_id_information')}</Alert>
        </div>
      )}
    </div>
  );
};
