import { useTranslation } from 'react-i18next';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope } from '../utils/ValidateNavigationUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import type { ValidateConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';

export const ValidateAllTasksConfig = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsSchema } = useLayoutSetsQuery(org, app);
  const { validationOnNavigation: configData } = layoutSetsSchema;
  const config = useConvertToInternalConfig(configData);

  const handleSave = (updatedConfig: ValidateConfigState) => {
    // For now just log the config that would be  saved, will implement actual save logic in next PR
    console.log(`Saved validation rule with config:`, updatedConfig);
  };

  return (
    <ValidateNavigationConfig
      propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
      scope={Scope.AllTasks}
      config={config}
      onSave={handleSave}
    />
  );
};
