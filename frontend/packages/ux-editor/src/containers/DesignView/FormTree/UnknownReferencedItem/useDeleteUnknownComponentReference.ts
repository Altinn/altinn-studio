import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../../hooks/useAppContext';
import { useSelectedFormLayoutWithName } from '../../../../hooks';
import { useFormLayoutMutation } from '../../../../hooks/mutations/useFormLayoutMutation';
import { removeComponent } from '../../../../utils/formLayoutUtils';
import type { IInternalLayout } from '../../../../types/global';

export const useDeleteUnknownComponentReference = () => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const { layoutName } = useSelectedFormLayoutWithName();
  const { mutateAsync: updateFormLayoutMutation } = useFormLayoutMutation(
    org,
    app,
    layoutName,
    selectedLayoutSet,
  );

  return async (layout: IInternalLayout, id: string): Promise<IInternalLayout> => {
    const updatedLayout = removeComponent(layout, id);
    return await updateFormLayoutMutation(updatedLayout);
  };
};
