import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSwitch } from '@studio/components';
import { useRunDefaultValidator } from './useRunDefaultValidator';

/**
 * A switch rather than a radio group: the runtime reads the value as a plain `bool` whose default
 * is `false`, so an absent element is not an unanswered question but a definite "off". There is no
 * third state for the control to show.
 */
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
