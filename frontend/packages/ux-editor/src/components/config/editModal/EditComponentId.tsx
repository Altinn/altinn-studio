import React, { useState } from 'react';
import type { FormComponent } from '../../../types/FormComponent';
import { StudioTextField } from '@studio/components/src/components/StudioTextField/StudioTextField';
import { KeyVerticalIcon } from '@navikt/aksel-icons';
import classes from './EditComponentId.module.css';
import { idExists } from '../../../utils/formLayoutUtils';
import { useSelectedFormLayout } from '../../../hooks';
import { useTranslation } from 'react-i18next';

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
  const [error, setError] = useState<string | undefined>(undefined);
  const [idInputValue, setIdInputValue] = useState(component.id);
  const { components, containers } = useSelectedFormLayout();
  const { t } = useTranslation();
  const handleIdChange = (id: string) => {
    handleComponentUpdate({
      ...component,
      id,
    });
  };

  const validateId = (id: string) => {
    if (id.length === 0) {
      setError(t('ux_editor.modal_properties_component_id_required_error'));
      return;
    }
    if (id !== component.id && idExists(id, components, containers)) {
      setError(t('ux_editor.modal_properties_component_id_not_unique_error'));
      return;
    }
    setError(undefined);
  };

  return (
    <div>
      <StudioTextField
        viewProps={{
          children: `ID: ${component.id}`,
          variant: 'tertiary',
          fullWidth: true,
          style: { paddingLeft: 0, paddingRight: 0 },
        }}
        inputProps={{
          prefix: <KeyVerticalIcon className={classes.prefixKeyIcon} />,
          icon: undefined,
          value: component.id,
          onBlur: (e) => handleIdChange(e.target.value),
          onChange: (e) => validateId(e.target.value),
          label: 'ID',
          size: 'small',
          error,
        }}
      />
    </div>
  );
};
