import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSwitch } from '@studio/components';
import { useRunDefaultValidator } from './useRunDefaultValidator';

/** A switch: the runtime reads an absent element as `false`, so there is no third state to show. */
export const EditRunDefaultValidator = (): React.ReactElement => {
  const { t } = useTranslation();
  const { runDefaultValidator, setRunDefaultValidator } = useRunDefaultValidator();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRunDefaultValidator(event.target.checked);
  };

  return (
    <StudioSwitch
      checked={runDefaultValidator}
      description={t('process_editor.configuration_panel_run_default_validator_description')}
      label={t('process_editor.configuration_panel_run_default_validator_label')}
      onChange={handleChange}
    />
  );
};
