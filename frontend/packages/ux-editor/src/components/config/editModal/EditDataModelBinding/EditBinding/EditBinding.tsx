import React from 'react';
import type { FormItem } from '../../../../../types/FormItem';
import { StudioButton, StudioDeleteButton } from '@studio/components';
import { XMarkIcon } from '@studio/icons';
import classes from './EditBinding.module.css';
import { useTranslation } from 'react-i18next';
import { Fieldset } from '@digdir/design-system-react';
import { SelectDataModelBinding } from './SelectDataModelBinding';
import { SelectDataFieldBinding } from './SelectDataFieldBinding';
import {
  getMaxOccursFromDataModel,
  getMinOccursFromDataModel,
  getXsdDataTypeFromDataModel,
} from '@altinn/ux-editor/utils/dataModel';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useAppContext } from '@altinn/ux-editor/hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useDataModelMetadataQuery } from '@altinn/ux-editor/hooks/queries/useDataModelMetadataQuery';
import type { UpdateFormMutateOptions } from '@altinn/ux-editor/containers/FormItemContext';

export type EditBindingProps = {
  bindingKey: string;
  selectedDataModel: string;
  component: FormItem;
  helpText: string;
  label: string;
  handleComponentChange: (component: FormItem, mutateOptions?: UpdateFormMutateOptions) => void;
  setDataModelSelectVisible: (visible: boolean) => void;
  selectedDataField: string;
};

export const EditBinding = ({
  bindingKey,
  selectedDataModel,
  component,
  helpText,
  label,
  handleComponentChange,
  setDataModelSelectVisible,
  selectedDataField,
}: EditBindingProps) => {
  const { t } = useTranslation();
  const { selectedFormLayoutSetName, refetchLayouts } = useAppContext();
  const { org, app } = useStudioEnvironmentParams();
  const { data: dataModels, isPending: dataModelsArePending } = useAppMetadataModelIdsQuery(
    org,
    app,
    false,
  );
  const { data: dataFields, isPending: dataFieldsArePending } = useDataModelMetadataQuery(
    org,
    app,
    selectedFormLayoutSetName,
    selectedDataModel,
  );

  if (dataModelsArePending || dataFieldsArePending) {
    return;
  }

  const handleBindingChange = (updatedBinding: { property: string; dataType: string }) => {
    const selectedDataFieldElement = updatedBinding.property;
    handleComponentChange(
      {
        ...component,
        dataModelBindings: {
          ...component.dataModelBindings,
          [bindingKey]: shouldDisplayFeature('dataModelBindingSelector')
            ? updatedBinding
            : selectedDataFieldElement,
        },
        required: getMinOccursFromDataModel(selectedDataFieldElement, dataFields) > 0 || undefined,
        timeStamp:
          component.type === ComponentType.Datepicker
            ? getXsdDataTypeFromDataModel(selectedDataFieldElement, dataFields) === 'DateTime'
            : undefined,
        maxCount:
          component.type === ComponentType.RepeatingGroup
            ? getMaxOccursFromDataModel(selectedDataFieldElement, dataFields)
            : undefined,
      } as FormItem,
      {
        onSuccess: async () => {
          await refetchLayouts(selectedFormLayoutSetName, true);
        },
      },
    );
  };

  const handleDelete = () => {
    handleBindingChange({ property: '', dataType: '' });
    setDataModelSelectVisible(false);
  };

  return (
    <Fieldset legend={label} className={classes.editBinding} size='small'>
      <SelectDataModelBinding
        selectedDataModel={selectedDataModel}
        dataModels={dataModels}
        bindingKey={bindingKey}
        handleBindingChange={handleBindingChange}
      />
      <SelectDataFieldBinding
        selectedDataModel={selectedDataModel}
        component={component}
        handleBindingChange={handleBindingChange}
        bindingKey={bindingKey}
        helpText={helpText}
        selectedDataField={selectedDataField}
      />

      <div className={classes.buttons}>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={() => setDataModelSelectVisible(false)}
          size='small'
          title={t('general.close')}
          variant='secondary'
        />
        <StudioDeleteButton
          confirmMessage={t('right_menu.data_model_bindings_delete_confirm')}
          onDelete={handleDelete}
          size='small'
          title={t('general.delete')}
        />
      </div>
    </Fieldset>
  );
};
