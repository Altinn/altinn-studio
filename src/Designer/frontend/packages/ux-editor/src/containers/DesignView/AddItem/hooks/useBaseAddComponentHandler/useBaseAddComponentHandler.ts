import type { IInternalLayout } from '../../../../../types/global';
import { useFormItemContext } from '../../../../FormItemContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../../hooks';
import { useAddItemToLayoutMutation } from '../../../../../hooks/mutations/useAddItemToLayoutMutation';
import { useFormLayoutMutation } from '../../../../../hooks/mutations/useFormLayoutMutation';
import { ComponentType, type CustomComponentType } from 'app-shared/types/ComponentType';
import { addItemOfType, getItem } from '../../../../../utils/formLayoutUtils';
import { ItemType } from '../../../../../components/Properties/ItemType';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';
import { isContainer } from '../../../../../utils/formItemUtils';
import { useValidDataModels } from '../../../../../hooks/useValidDataModels';
import {
  getDataModelFields,
  getMaxOccursFromDataModelFields,
  getMinOccursFromDataModelFields,
  getXsdDataTypeFromDataModelFields,
} from '../../../../../utils/dataModelUtils';
import type { FormComponent } from '../../../../../types/FormComponent';
import { ObjectUtils } from '@studio/pure-functions';

export const useBaseAddComponentHandler = (layout: IInternalLayout) => {
  const { handleEdit } = useFormItemContext();
  const { doReloadPreview } = usePreviewContext();
  const { org, app } = useStudioEnvironmentParams();
  const { setSelectedItem, selectedFormLayoutName } = useAppContext();
  const { layoutSet } = useUxEditorParams();
  const { dataModelMetadata, selectedDataModel } = useValidDataModels('');

  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(org, app, layoutSet);
  const { mutate: updateFormLayout } = useFormLayoutMutation(
    org,
    app,
    selectedFormLayoutName,
    layoutSet,
  );

  const addItem = (
    type: ComponentType | CustomComponentType,
    parentId: string,
    index: number,
    newId: string,
    onDone: () => void,
  ) => {
    let updatedLayout = addItemOfType(layout, type, newId, parentId, index);

    const newComponent = getItem(updatedLayout, newId);
    const isCustomComponent = !Object.values(ComponentType).includes(type as ComponentType);

    const shouldAutoBind =
      !isContainer(newComponent) &&
      !isCustomComponent &&
      dataModelMetadata &&
      selectedDataModel &&
      !newComponent.dataModelBindings?.simpleBinding?.field;

    let bindingApplied = false;

    if (shouldAutoBind) {
      const bindingKey = 'simpleBinding';
      const dataModelFields = getDataModelFields({
        componentType: type as ComponentType,
        bindingKey,
        dataModelMetadata,
      });

      const firstField = dataModelFields[0];
      if (firstField?.value) {
        const autoBinding = {
          field: firstField.value,
          dataType: selectedDataModel,
        };
        updatedLayout = ObjectUtils.deepCopy(updatedLayout);
        const component = updatedLayout.components[newId] as FormComponent;
        updatedLayout.components[newId] = {
          ...component,
          dataModelBindings: {
            ...(component.dataModelBindings || {}),
            [bindingKey]: autoBinding,
          },
          required: getMinOccursFromDataModelFields(firstField.value, dataModelMetadata),
          timeStamp: getXsdDataTypeFromDataModelFields(
            type as ComponentType,
            firstField.value,
            dataModelMetadata,
          ),
          maxCount: getMaxOccursFromDataModelFields(
            type as ComponentType,
            firstField.value,
            dataModelMetadata,
          ),
        } as FormComponent;
        bindingApplied = true;
      }
    }

    handleEdit(getItem(updatedLayout, newId));
    setSelectedItem({ type: ItemType.Component, id: newId });

    if (bindingApplied) {
      updateFormLayout(
        { internalLayout: updatedLayout },
        {
          onSuccess: () => {
            doReloadPreview();
            onDone();
          },
        },
      );
    } else {
      addItemToLayout(
        { componentType: type, newId, parentId, index },
        {
          onSuccess: () => {
            doReloadPreview();
            onDone();
          },
        },
      );
    }
  };

  return { addItem };
};
