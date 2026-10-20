import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSwitch } from '@studio/components';
import { useRunDefaultValidator } from './useRunDefaultValidator';
import classes from './EditRunDefaultValidator.module.css';

/** A missing element means false at runtime, so the switch needs only two states. */
export const EditRunDefaultValidator = (): React.ReactElement => {
  const { t } = useTranslation();
  const { runDefaultValidator, setRunDefaultValidator } = useRunDefaultValidator();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRunDefaultValidator(event.target.checked);
  };

  return (
    <StudioSwitch
      className={classes.switch}
      checked={runDefaultValidator}
      description={t('process_editor.configuration_panel_run_default_validator_description')}
      label={t('process_editor.configuration_panel_run_default_validator_label')}
      onChange={handleChange}
    />
  );
};
