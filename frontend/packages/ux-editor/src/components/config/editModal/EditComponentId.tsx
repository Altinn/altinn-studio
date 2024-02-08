import React, { useEffect, useState } from 'react';
import type { FormComponent } from '../../../types/FormComponent';
import { StudioTextfieldSchema } from '@studio/components';
import { KeyVerticalIcon } from '@navikt/aksel-icons';
import classes from './EditComponentId.module.css';
import { idExists } from '../../../utils/formLayoutUtils';
import { useSelectedFormLayout } from '../../../hooks';
import { useTranslation } from 'react-i18next';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';

export interface IEditComponentId {
  handleComponentUpdate: (component: FormComponent) => void;
  component: FormComponent;
  helpText?: string;
}

export const EditComponentId = ({
  component,
  handleComponentUpdate,
  helpText,
}: IEditComponentId) => {
  const [idInputValue, setIdInputValue] = useState(component.id);
  const { components, containers } = useSelectedFormLayout();
  const [{ data: layoutSchema }] = useLayoutSchemaQuery();
  const { t } = useTranslation();

  useEffect(() => {
    setIdInputValue(component.id);
  }, [component.id]);

  const handleIdChange = (id: string) => {
    handleComponentUpdate({
      ...component,
      id,
    });
  };

  const validateId = (value: string) => {
    setIdInputValue(value);
    if (value.length === 0) {
      return t('ux_editor.modal_properties_component_id_not_unique_error');
    }
    if (value !== component.id && idExists(value, components, containers)) {
      return 'ux_editor.modal_properties_component_id_not_unique_error';
    }
    return undefined;
  };

  return (
    <div>
      <StudioTextfieldSchema
        schema={layoutSchema}
        key={component.id}
        helpText={helpText}
        viewProps={{
          children: `ID: ${component.id}`,
          variant: 'tertiary',
          fullWidth: true,
          style: { paddingLeft: 0, paddingRight: 0 },
        }}
        inputProps={{
          icon: <KeyVerticalIcon className={classes.prefixKeyIcon} />,
          value: idInputValue,
          onChange: (e) => handleIdChange(e.target.value),
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
