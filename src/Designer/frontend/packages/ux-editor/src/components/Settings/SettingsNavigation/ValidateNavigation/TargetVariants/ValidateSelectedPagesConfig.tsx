import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope, convertToExternalConfig } from '../utils/ValidateNavigationUtils';
import type { InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidationOnNavigationPageSettingsMutation } from '@altinn/ux-editor/hooks/mutations/useValidationOnNavigationPageSettingsMutation';
import { useValidationOnNavigationQuery } from '@altinn/ux-editor/hooks/queries/useValidationOnNavigationQuery';
import { ValidationOnNavigationLevel } from 'app-shared/types/global';

export const ValidateSelectedPagesConfig = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: pageValidationData } = useValidationOnNavigationQuery(
    org,
    app,
    ValidationOnNavigationLevel.Pages,
  );
  const { mutate: updatePages } = useValidationOnNavigationPageSettingsMutation(org, app);
  const internalConfigs = useConvertToInternalConfig(pageValidationData ?? []);

  const handleSave = (updatedConfig: InternalConfigState, index?: number) => {
    const updatedInternalConfigs = [...internalConfigs];
    if (index !== undefined) {
      updatedInternalConfigs[index] = updatedConfig;
    } else {
      updatedInternalConfigs.push(updatedConfig);
    }

    updatePages(updatedInternalConfigs.map(convertToExternalConfig));
  };

  const handleDelete = (index: number) => {
    const newIntConfigs = internalConfigs.filter((_, i) => i !== index);
    updatePages(newIntConfigs.map(convertToExternalConfig));
  };

  return (
    <>
      {internalConfigs.map((conf, index) => (
        <ValidateNavigationConfig
          key={index}
          scope={Scope.SelectedPages}
          config={conf}
          existingConfigs={internalConfigs}
          onSave={(newConf) => handleSave(newConf, index)}
          onDelete={() => handleDelete(index)}
        />
      ))}
      <ValidateNavigationConfig
        scope={Scope.SelectedPages}
        existingConfigs={internalConfigs}
        onSave={(newConf) => handleSave(newConf)}
      />
    </>
  );
};
