import { useTranslation } from 'react-i18next';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { convertToInternalConfig, Scope } from '../utils/ValidateNavigationUtils';
import type { ValidateConfigState } from '../utils/ValidateNavigationTypes';

export const ValidateSelectedPagesConfig = () => {
  const { t } = useTranslation();

  const dummyData = [
    {
      show: ['Schema', 'Component'],
      page: 'current',
      task: 'oppgave1',
      pages: ['page1', 'page2'],
    },
    {
      show: ['Schema'],
      page: 'currentAndPrevious',
      task: 'oppgave2',
      pages: ['page3'],
    },
  ];
  const internalConfig = convertToInternalConfig(dummyData) as ValidateConfigState[];

  const handleSave = (updatedConfig: ValidateConfigState) => {
    // For now just log the config that would be  saved, will implement actual save logic in next PR
    console.log(`Saved validation rule with config:`, updatedConfig);
  };

  return (
    <>
      {internalConfig &&
        internalConfig.map((conf, index) => (
          <ValidateNavigationConfig
            key={index}
            propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
            scope={Scope.SelectedPages}
            config={conf}
            onSave={handleSave}
          />
        ))}
      <ValidateNavigationConfig
        propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
        scope={Scope.SelectedPages}
        onSave={handleSave}
      />
    </>
  );
};
