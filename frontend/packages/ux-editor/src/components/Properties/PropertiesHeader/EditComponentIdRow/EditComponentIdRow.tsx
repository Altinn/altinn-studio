import React, { useState } from 'react';
import { StudioTextfieldSchema, type SchemaValidationError } from '@studio/components';
import { KeyVerticalIcon } from '@navikt/aksel-icons';
import classes from './EditComponentIdRow.module.css';
import { idExists } from '../../../../utils/formLayoutUtils';
import { useSelectedFormLayout } from '../../../../hooks';
import { useTranslation } from 'react-i18next';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { ajv } from 'app-shared/utils/formValidationUtils';
import type { FormItem } from '../../../../types/FormItem';

export interface EditComponentIdRowProps {
  handleComponentUpdate: (component: FormItem) => void;
  component: FormItem;
  helpText?: string;
}

export const EditComponentIdRow = ({
  component,
  handleComponentUpdate,
}: EditComponentIdRowProps) => {
  const { components, containers } = useSelectedFormLayout();
  const { t } = useTranslation();
  const [{ data: layoutSchema }] = useLayoutSchemaQuery();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(null);

  const idInputValue = component.id;

  const saveComponentUpdate = (id: string) => {
    handleComponentUpdate({
      ...component,
      id,
    });
  };

  const validateId = (value: string) => {
    if (value?.length === 0) {
      return t('validation_errors.required');
    }
    if (value !== component.id && idExists(value, components, containers)) {
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
    <div className={classes.StudioTextfieldSchema}>
      <StudioTextfieldSchema
        onError={handleValidationError}
        schema={layoutSchema}
        propertyPath='definitions/component/properties/id'
        key={component.id}
        helpText={t('ux_editor.edit_component.id_help_text')}
        viewProps={{
          children: `ID: ${component.id}`,
          variant: 'tertiary',
          fullWidth: true,
          style: { paddingLeft: 0, paddingRight: 0 },
        }}
        inputProps={{
          icon: <KeyVerticalIcon className={classes.prefixIcon} />,
          value: idInputValue,
          onBlur: (event) => saveComponentUpdate(event.target.value),
          label: 'ID',
          size: 'small',
          error: errorMessage,
        }}
        customValidation={(value) => {
          return validateId(value);
        }}
        jsonValidator={ajv}
      />
    </div>
  );
};
