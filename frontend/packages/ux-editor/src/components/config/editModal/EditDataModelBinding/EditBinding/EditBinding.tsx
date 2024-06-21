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
import { EditBindingButtons } from './EditBindingButtons';
import { useValidDataModels } from '@altinn/ux-editor/hooks/useValidDataModels';
import { StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type EditBindingProps = {
  bindingKey: string;
  component: FormItem;
  helpText: string;
  label: string;
  handleComponentChange: (component: FormItem, mutateOptions?: UpdateFormMutateOptions) => void;
  setDataModelSelectVisible: (visible: boolean) => void;
  internalBindingFormat: InternalBindingFormat;
};

export const EditBinding = ({
  bindingKey,
  component,
  helpText,
  label,
  handleComponentChange,
  setDataModelSelectVisible,
  internalBindingFormat,
}: EditBindingProps) => {
  const { t } = useTranslation();
  const { selectedFormLayoutSetName, refetchLayouts } = useAppContext();
  const { dataModelMetaData, isLoadingDataModels } = useValidDataModels(
    internalBindingFormat.dataType,
  );

  const handleBindingChange = (updatedBinding: InternalBindingFormat) => {
    const selectedDataFieldElement = updatedBinding.field;
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
      {isLoadingDataModels ? (
        <StudioSpinner
          showSpinnerTitle={false}
          spinnerTitle={t('ux_editor.modal_properties_loading')}
        />
      ) : (
        <>
          <SelectDataModelBinding
            currentDataModel={internalBindingFormat.dataType}
            handleBindingChange={handleBindingChange}
            bindingKey={bindingKey}
          />
          <SelectDataFieldBinding
            internalBindingFormat={internalBindingFormat}
            handleBindingChange={handleBindingChange}
            bindingKey={bindingKey}
            helpText={helpText}
            componentType={component.type}
          />
          <EditBindingButtons
            handleBindingChange={handleBindingChange}
            setDataModelSelectVisible={setDataModelSelectVisible}
          />
        </>
      )}
    </Fieldset>
  );
};
