import React, { type ChangeEvent } from 'react';
import classes from './EmptyTextField.module.css';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { StudioTextfield } from '@studio/components-legacy';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';

type EmptyTextFieldProps = {
  onChange: (updatedOverride: Summary2OverrideConfig) => void;
  override: Summary2OverrideConfig;
};

export const EmptyTextField = ({ onChange, override }: EmptyTextFieldProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  if (!open) {
    return (
      <StudioProperty.Button
        className={classes.propertyButton}
        value={override.emptyFieldText}
        property={t('ux_editor.component_properties.summary.override.empty_field_text')}
        onClick={() => setOpen(true)}
      ></StudioProperty.Button>
    );
  }

  return (
    <StudioTextfield
      label={t('ux_editor.component_properties.summary.override.empty_field_text')}
      autoFocus={true}
      onBlur={() => setOpen(false)}
      onKeyDown={({ key }) => key === 'Enter' && setOpen(false)}
      value={override.emptyFieldText}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange({ ...override, emptyFieldText: event.target.value })
      }
    />
  );
};
