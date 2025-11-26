import React, { useCallback, useEffect } from 'react';
import type { FormItem } from '../../../../../types/FormItem';
import { SelectDataModelBinding } from './SelectDataModelBinding';
import { SelectDataFieldBinding } from './SelectDataFieldBinding';
import {
  getDataModelFields,
  getMaxOccursFromDataModelFields,
  getMinOccursFromDataModelFields,
  getXsdDataTypeFromDataModelFields,
} from '@altinn/ux-editor/utils/dataModelUtils';
import { useAppContext } from '@altinn/ux-editor/hooks';
import type { UpdateFormMutateOptions } from '@altinn/ux-editor/containers/FormItemContext';
import { useValidDataModels } from '@altinn/ux-editor/hooks/useValidDataModels';
import { StudioSpinner } from '@studio/components-legacy';
import { StudioConfigCard } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { formItemConfigs } from '@altinn/ux-editor/data/formItemConfig';
import type { ExplicitDataModelBinding } from '@altinn/ux-editor/types/global';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export type EditBindingProps = {
  bindingKey: string;
  component: FormItem;
  label: string;
  handleComponentChange: (component: FormItem, mutateOptions?: UpdateFormMutateOptions) => void;
  onSetDataModelSelectVisible: (visible: boolean) => void;
  internalBindingFormat?: ExplicitDataModelBinding;
};

export const EditBinding = ({
  bindingKey,
  component,
  label,
  handleComponentChange,
  onSetDataModelSelectVisible,
  internalBindingFormat,
}: EditBindingProps) => {
  const [binding, setBinding] = React.useState<ExplicitDataModelBinding | undefined>(
    internalBindingFormat,
  );
  const { t } = useTranslation();
  const { updateLayoutsForPreview } = useAppContext();
  const { layoutSet } = useUxEditorParams();
  const { dataModelMetadata, isLoadingDataModels, selectedDataModel } = useValidDataModels(
    internalBindingFormat?.dataType,
  );

  const saveBinding = useCallback(
    (updatedBinding?: ExplicitDataModelBinding) => {
      const selectedDataFieldElement = updatedBinding?.field;
      const value =
        updatedBinding ??
        formItemConfigs[component.type]?.defaultProperties?.['dataModelBindings']?.[bindingKey];
      const dataModelBindings = { ...component.dataModelBindings };
      if (value === undefined || value === null) {
        delete dataModelBindings[bindingKey];
      } else {
        dataModelBindings[bindingKey] = value;
      }
      handleComponentChange(
        {
          ...component,
          dataModelBindings: Object.keys(dataModelBindings).length ? dataModelBindings : undefined,
          required: getMinOccursFromDataModelFields(selectedDataFieldElement, dataModelMetadata),
          timeStamp: getXsdDataTypeFromDataModelFields(
            component.type,
            selectedDataFieldElement,
            dataModelMetadata,
          ),
          maxCount: getMaxOccursFromDataModelFields(
            component.type,
            selectedDataFieldElement,
            dataModelMetadata,
          ),
        } as FormItem,
        {
          onSuccess: async () => {
            await updateLayoutsForPreview(layoutSet, true);
          },
        },
      );
    },
    [
      component,
      bindingKey,
      dataModelMetadata,
      handleComponentChange,
      layoutSet,
      updateLayoutsForPreview,
    ],
  );

  const handleAutoSave = useCallback(() => {
    const dataModelFields = getDataModelFields({
      componentType: component.type,
      bindingKey,
      dataModelMetadata,
    });
    const firstField = dataModelFields[0];
    const dataTypeToUse = binding?.dataType || selectedDataModel;

    if (dataTypeToUse && dataModelMetadata && !binding?.field && firstField?.value) {
      const autoBinding = {
        field: firstField.value,
        dataType: dataTypeToUse,
      };
      setBinding(autoBinding);
      saveBinding(autoBinding);
    }
  }, [
    selectedDataModel,
    dataModelMetadata,
    binding?.field,
    binding?.dataType,
    component.type,
    bindingKey,
    saveBinding,
  ]);

  useEffect(() => {
    handleAutoSave();
  }, [handleAutoSave]);

  const handleBindingChange = (updatedBinding?: ExplicitDataModelBinding) => {
    saveBinding(updatedBinding);
    onSetDataModelSelectVisible(false);
  };

  const handleDelete = () => {
    handleBindingChange(undefined);
    onSetDataModelSelectVisible(false);
  };

  const isDeleteDisabled = !Object.values(component?.dataModelBindings || {}).some(
    (value) => value,
  );
  const isSaveDisabled =
    !binding?.field ||
    !binding?.dataType ||
    (internalBindingFormat &&
      internalBindingFormat.field === binding.field &&
      internalBindingFormat.dataType === binding.dataType);

  return (
    <StudioConfigCard>
      <StudioConfigCard.Header
        cardLabel={label}
        onDelete={handleDelete}
        isDeleteDisabled={isDeleteDisabled}
        confirmDeleteMessage={t('right_menu.data_model_bindings_delete_confirm')}
        deleteAriaLabel={t('right_menu.data_model_bindings_delete_button')}
      />
      <StudioConfigCard.Body>
        {isLoadingDataModels ? (
          <StudioSpinner spinnerTitle={t('ux_editor.modal_properties_loading')} />
        ) : (
          <>
            <SelectDataModelBinding
              currentDataModel={internalBindingFormat?.dataType}
              handleBindingChange={setBinding}
              bindingKey={bindingKey}
            />
            <SelectDataFieldBinding
              internalBindingFormat={binding}
              handleBindingChange={setBinding}
              bindingKey={bindingKey}
              componentType={component.type}
            />
          </>
        )}
      </StudioConfigCard.Body>
      <StudioConfigCard.Footer
        saveLabel={t('right_menu.data_model_bindings_save_button')}
        cancelLabel={t('general.cancel')}
        onCancel={() => onSetDataModelSelectVisible(false)}
        onSave={() => handleBindingChange(binding)}
        isLoading={isLoadingDataModels}
        isDisabled={isSaveDisabled}
      />
    </StudioConfigCard>
  );
};
