import { SavableFormLayoutSettings } from '@altinn/ux-editor/classes/SavableFormLayoutSettings';
import { useFormLayoutsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '@altinn/ux-editor/hooks/useAppContext';
import { useFormLayoutSettingsMutation } from './mutations/useFormLayoutSettingsMutation';
import { FormLayoutSettings } from '@altinn/ux-editor/classes/FormLayoutSettings';

export const useSavableFormLayoutSettings = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: layoutSettings } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const { mutate: saveLayoutSettings } = useFormLayoutSettingsMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const formLayoutSettings = new FormLayoutSettings(layoutSettings);

  return new SavableFormLayoutSettings(formLayoutSettings, saveLayoutSettings);
};
