import React from 'react';
import type { FormItem } from '../../../../../types/FormItem';
import { SelectDataModelBinding } from './SelectDataModelBinding';
import { SelectDataFieldBinding } from './SelectDataFieldBinding';
import {
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
  const { dataModelMetadata, isLoadingDataModels } = useValidDataModels(
    internalBindingFormat?.dataType,
  );

  const handleBindingChange = (updatedBinding?: ExplicitDataModelBinding) => {
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
    onSetDataModelSelectVisible(false);
  };

  const handleDelete = () => {
    handleBindingChange(undefined);
    onSetDataModelSelectVisible(false);
  };

  return (
    <StudioConfigCard>
      <StudioConfigCard.Header
        cardLabel={label}
        onDelete={handleDelete}
        isDeleteDisabled={!Object.keys(component?.dataModelBindings || {}).length}
        confirmMessage={t('right_menu.data_model_bindings_delete_confirm')}
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
              internalBindingFormat={internalBindingFormat}
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
      />
    </StudioConfigCard>
  );
};
