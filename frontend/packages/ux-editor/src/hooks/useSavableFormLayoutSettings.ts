import { SavableFormLayoutSettings } from '@altinn/ux-editor/classes/SavableFormLayoutSettings';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '@altinn/ux-editor/hooks/useAppContext';
import { useFormLayoutSettingsMutation } from './mutations/useFormLayoutSettingsMutation';
import { FormLayoutSettings } from '@altinn/ux-editor/classes/FormLayoutSettings';
import { useFormLayoutSettingsQuery } from './queries/useFormLayoutSettingsQuery';

export const useSavableFormLayoutSettings = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: layoutSettings } = useFormLayoutSettingsQuery(org, app, selectedFormLayoutSetName);
  const { mutate: saveLayoutSettings } = useFormLayoutSettingsMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const formLayoutSettings = new FormLayoutSettings(layoutSettings);

  return new SavableFormLayoutSettings(formLayoutSettings, saveLayoutSettings);
};
