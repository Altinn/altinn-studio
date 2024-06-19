import React from 'react';
import type { FormItem } from '../../../../../types/FormItem';
import classes from './EditBinding.module.css';
import { Fieldset } from '@digdir/design-system-react';
import { SelectDataModelBinding } from './SelectDataModelBinding';
import { SelectDataFieldBinding } from './SelectDataFieldBinding';
import {
  type InternalBindingFormat,
  getMaxOccursFromDataModelFields,
  getMinOccursFromDataModelFields,
  getXsdDataTypeFromDataModelFields,
} from '@altinn/ux-editor/utils/dataModel';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useAppContext } from '@altinn/ux-editor/hooks';
import type { UpdateFormMutateOptions } from '@altinn/ux-editor/containers/FormItemContext';
import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';
import { EditBindingButtons } from './EditBindingButtons';
import { useDataModelBindings } from '@altinn/ux-editor/hooks/useDataModelBindings';

export type EditBindingProps = {
  bindingKey: string;
  component: FormItem;
  helpText: string;
  label: string;
  handleComponentChange: (component: FormItem, mutateOptions?: UpdateFormMutateOptions) => void;
  setDataModelSelectVisible: (visible: boolean) => void;
  internalBindingFormat: InternalBindingFormat;
  dataModelFieldsFilter: (dataModelField: DataModelFieldElement) => boolean;
};

export const EditBinding = ({
  bindingKey,
  component,
  helpText,
  label,
  handleComponentChange,
  setDataModelSelectVisible,
  internalBindingFormat,
  dataModelFieldsFilter,
}: EditBindingProps) => {
  const { dataModelMetaData } = useDataModelBindings({
    bindingFormat: internalBindingFormat,
    dataModelFieldsFilter,
  });
  const { selectedFormLayoutSetName, refetchLayouts } = useAppContext();

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
        required:
          getMinOccursFromDataModelFields(selectedDataFieldElement, dataModelMetaData) > 0 ||
          undefined,
        timeStamp:
          component.type === ComponentType.Datepicker
            ? getXsdDataTypeFromDataModelFields(selectedDataFieldElement, dataModelMetaData) ===
              'DateTime'
            : undefined,
        maxCount:
          component.type === ComponentType.RepeatingGroup
            ? getMaxOccursFromDataModelFields(selectedDataFieldElement, dataModelMetaData)
            : undefined,
      } as FormItem,
      {
        onSuccess: async () => {
          await refetchLayouts(selectedFormLayoutSetName, true);
        },
      },
    );
  };

  return (
    <Fieldset legend={label} className={classes.editBinding} size='small'>
      <SelectDataModelBinding
        dataModelFieldsFilter={dataModelFieldsFilter}
        internalBindingFormat={internalBindingFormat}
        handleBindingChange={handleBindingChange}
        bindingKey={bindingKey}
      />
      <SelectDataFieldBinding
        dataModelFieldsFilter={dataModelFieldsFilter}
        internalBindingFormat={internalBindingFormat}
        handleBindingChange={handleBindingChange}
        bindingKey={bindingKey}
        helpText={helpText}
      />
      <EditBindingButtons
        handleBindingChange={handleBindingChange}
        setDataModelSelectVisible={setDataModelSelectVisible}
      />
    </Fieldset>
  );
};
