import { useFormLayoutsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutsQuery';
import { getAllLayoutComponents } from '@altinn/ux-editor/utils/formLayoutUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { ComponentType } from 'app-shared/types/ComponentType';

export const useSubformLayoutValidation = (subformLayoutSetName: string): boolean => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: formLayout } = useFormLayoutsQuery(org, app, subformLayoutSetName);

  const excludedComponents = [ComponentType.CustomButton];

  if (formLayout) {
    return Object.values(formLayout).some(
      (value) => getAllLayoutComponents(value, excludedComponents).length > 0,
    );
  }
  return false;
};
