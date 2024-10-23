import { useFormLayoutsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutsQuery';
import { getAllLayoutComponents } from '@altinn/ux-editor/utils/formLayoutUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useSubFormLayoutValidation = (subFormLayoutSetName: string): boolean => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: formLayout } = useFormLayoutsQuery(org, app, subFormLayoutSetName);

  if (formLayout) {
    return Object.values(formLayout).some((value) => getAllLayoutComponents(value).length > 0);
  }
  return false;
};
