import type { IInternalLayout } from '@altinn/ux-editor/types/global';
import { useFormItemContext } from '@altinn/ux-editor/containers/FormItemContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '@altinn/ux-editor/hooks';
import { useAddItemToLayoutMutation } from '@altinn/ux-editor/hooks/mutations/useAddItemToLayoutMutation';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { addItemOfType, getItem } from '@altinn/ux-editor/utils/formLayoutUtils';
import { ItemType } from '@altinn/ux-editor/components/Properties/ItemType';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';

export const useBaseAddComponentHandler = (layout: IInternalLayout) => {
  const { handleEdit } = useFormItemContext();
  const { doReloadPreview } = usePreviewContext();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, setSelectedItem } = useAppContext();

  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const addItem = (
    type: ComponentType | CustomComponentType,
    parentId: string,
    index: number,
    newId: string,
    onDone: () => void,
  ) => {
    const updatedLayout = addItemOfType(layout, type, newId, parentId, index);

    addItemToLayout(
      { componentType: type, newId, parentId, index },
      {
        onSuccess: () => {
          doReloadPreview();
          onDone();
        },
      },
    );

    handleEdit(getItem(updatedLayout, newId));
    setSelectedItem({ type: ItemType.Component, id: newId });
  };

  return { addItem };
};
