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
} from '@altinn/ux-editor/utils/dataModelUtils';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
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
  onSetDataModelSelectVisible: (visible: boolean) => void;
  internalBindingFormat: InternalBindingFormat;
};

export const EditBinding = ({
  bindingKey,
  component,
  helpText,
  label,
  handleComponentChange,
  onSetDataModelSelectVisible,
  internalBindingFormat,
}: EditBindingProps) => {
  const { t } = useTranslation();
  const { selectedFormLayoutSetName, refetchLayouts } = useAppContext();
  const { dataModelMetadata, isLoadingDataModels } = useValidDataModels(
    internalBindingFormat.dataType,
  );

  const handleBindingChange = (updatedBinding: InternalBindingFormat) => {
    const selectedDataFieldElement = updatedBinding.field;
    handleComponentChange(
      {
        ...component,
        dataModelBindings: {
          ...component.dataModelBindings,
          [bindingKey]: shouldDisplayFeature('multipleDataModelsPerTask')
            ? updatedBinding
            : selectedDataFieldElement,
        },
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
            onSetDataModelSelectVisible={onSetDataModelSelectVisible}
          />
        </>
      )}
    </Fieldset>
  );
};
