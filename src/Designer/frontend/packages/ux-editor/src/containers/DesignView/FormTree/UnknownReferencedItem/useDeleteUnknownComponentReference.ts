import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useSelectedFormLayoutWithName, useAppContext } from '../../../../hooks';
import { useFormLayoutMutation } from '../../../../hooks/mutations/useFormLayoutMutation';
import { removeComponent } from '../../../../utils/formLayoutUtils';
import type { IInternalLayout } from '../../../../types/global';

export const useDeleteUnknownComponentReference = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, updateLayoutsForPreview } = useAppContext();
  const { layoutName } = useSelectedFormLayoutWithName();
  const { mutateAsync: updateFormLayoutMutation } = useFormLayoutMutation(
    org,
    app,
    layoutName,
    selectedFormLayoutSetName,
  );

  return async (layout: IInternalLayout, id: string): Promise<IInternalLayout> => {
    const updatedLayout = removeComponent(layout, id);
    return await updateFormLayoutMutation(
      { internalLayout: updatedLayout },
      {
        onSuccess: async () => {
          await updateLayoutsForPreview(selectedFormLayoutSetName);
        },
      },
    );
  };
};
