import React, { useEffect, useState } from 'react';
import type { FormComponent } from '../../../../types/FormComponent';
import { StudioTextfieldSchema } from '@studio/components';
import { KeyVerticalIcon } from '@navikt/aksel-icons';
import classes from './EditComponentIdRow.module.css';
import { idExists } from '../../../../utils/formLayoutUtils';
import { useSelectedFormLayout } from '../../../../hooks';
import { useTranslation } from 'react-i18next';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';

export interface EditComponentIdRowProps {
  handleComponentUpdate: (component: FormComponent) => void;
  component: FormComponent;
  helpText?: string;
}
export const EditComponentIdRow = ({
  component,
  handleComponentUpdate,
  helpText,
}: EditComponentIdRowProps) => {
  const { components, containers } = useSelectedFormLayout();
  const { t } = useTranslation();
  const [idInputValue, setIdInputValue] = useState(component.id);
  const [{ data: layoutSchema }] = useLayoutSchemaQuery();

  useEffect(() => {
    setIdInputValue(component.id);
  }, [component.id]);

  const saveComponentUpdate = (id: string) => {
    handleComponentUpdate({
      ...component,
      id,
    });
  };

  const validateId = (value: string) => {
    setIdInputValue(value);
    if (value.length === 0) {
      return t('validation_errors.required');
    }
    if (value !== component.id && idExists(value, components, containers)) {
      return t('ux_editor.modal_properties_component_id_not_unique_error');
    }
    return undefined;
  };

  return (
    <div className={classes.StudioTextfieldSchema}>
      <StudioTextfieldSchema
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
          icon: <KeyVerticalIcon className={classes.KeyVerticalIcon} />,
          value: idInputValue,
          onBlur: (e) => saveComponentUpdate(e.target.value),
          label: 'ID',
          size: 'small',
        }}
        customValidation={(value) => {
          return validateId(value);
        }}
      />
    </div>
  );
};
