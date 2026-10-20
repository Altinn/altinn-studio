import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { EnvTextConfigField } from '../../EnvironmentConfig';
import { useCorrespondenceResource } from './useCorrespondenceResource';

export const EditCorrespondenceResource = (): ReactElement => {
  const { t } = useTranslation();
  const { entries, updateEntries } = useCorrespondenceResource();

  return (
    <EnvTextConfigField
      description={t('process_editor.configuration_panel.correspondence_resource_description')}
      entries={entries}
      label={t('process_editor.configuration_panel.correspondence_resource')}
      onChange={updateEntries}
    />
  );
};
