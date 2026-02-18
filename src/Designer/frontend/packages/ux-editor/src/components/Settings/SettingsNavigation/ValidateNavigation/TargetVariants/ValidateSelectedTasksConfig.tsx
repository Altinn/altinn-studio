import { useTranslation } from 'react-i18next';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope } from '../utils/ValidateNavigationUtils';
import type { ValidateConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';

export const ValidateSelectedTasksConfig = () => {
  const { t } = useTranslation();

  const dummyData = [
    {
      show: ['Schema', 'Component'],
      page: 'current',
      tasks: ['oppgave1', 'oppgave2'],
    },
    {
      show: ['Schema'],
      page: 'currentAndPrevious',
      tasks: ['oppgave3'],
    },
  ];

  const internalConfigs = useConvertToInternalConfig(dummyData);

  const handleSave = (updatedConfig: ValidateConfigState) => {
    // For now just log the config that would be  saved, will implement actual save logic in next PR
    console.log(`Saved validation rule with config:`, updatedConfig);
  };

  return (
    <>
      {internalConfigs &&
        internalConfigs.map((conf, index) => (
          <ValidateNavigationConfig
            key={index}
            propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
            scope={Scope.SelectedTasks}
            config={conf}
            onSave={handleSave}
          />
        ))}
      <ValidateNavigationConfig
        propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
        scope={Scope.SelectedTasks}
        onSave={handleSave}
      />
    </>
  );
};
