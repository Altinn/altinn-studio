import { SavableFormLayoutSettings } from '@altinn/ux-editor/classes/SavableFormLayoutSettings';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useFormLayoutSettingsMutation } from './mutations/useFormLayoutSettingsMutation';
import { FormLayoutSettings } from '@altinn/ux-editor/classes/FormLayoutSettings';
import { useFormLayoutSettingsQuery } from './queries/useFormLayoutSettingsQuery';
import useUxEditorParams from './useUxEditorParams';

export const useSavableFormLayoutSettings = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { data: layoutSettings } = useFormLayoutSettingsQuery(org, app, layoutSet);
  const { mutate: saveLayoutSettings } = useFormLayoutSettingsMutation(org, app, layoutSet);
  const formLayoutSettings = new FormLayoutSettings(layoutSettings);

  return new SavableFormLayoutSettings(formLayoutSettings, saveLayoutSettings);
};
