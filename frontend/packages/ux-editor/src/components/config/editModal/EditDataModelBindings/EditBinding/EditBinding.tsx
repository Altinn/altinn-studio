import React from 'react';
import { SelectDataModelComponent } from '../../../SelectDataModelComponent';
import { getDataModelFieldsFilter } from '../../../../../utils/dataModel';
import type { FormItem } from '../../../../../types/FormItem';
import { StudioButton, StudioDeleteButton, StudioDisplayTile } from '@studio/components';
import { XMarkIcon } from '@studio/icons';
import classes from './EditBinding.module.css';
import { useTranslation } from 'react-i18next';
import { Fieldset, NativeSelect } from '@digdir/design-system-react';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { FormField } from 'app-shared/components/FormField';

export type EditBindingProps = {
  bindingKey: string;
  dataModelName: string;
  dataModels: string[];
  component: FormItem;
  helpText: string;
  label: string;
  onDataModelChange: (dataModel: string) => void;
  onBindingChange: (binding: string) => void;
  onClose: () => void;
  onDelete: () => void;
  selectedElement: string;
};

export const EditBinding = ({
  bindingKey,
  dataModelName,
  dataModels,
  component,
  helpText,
  label,
  onDataModelChange,
  onBindingChange,
  onClose,
  onDelete,
  selectedElement,
}: EditBindingProps) => {
  const { t } = useTranslation();
  const propertyPath = `definitions/component/properties/dataModelBindings/properties/${bindingKey}`;
  const shouldDisplayDataModelSelector = shouldDisplayFeature('dataModelBindingSelector');
  console.log(bindingKey);

  return (
    <Fieldset legend={label} className={classes.editBinding} size='small'>
      {shouldDisplayDataModelSelector ? (
        <FormField
          id={dataModelName}
          onChange={onDataModelChange}
          value={selectedElement}
          propertyPath={propertyPath}
          helpText={helpText}
          label={t('ux_editor.modal_properties_data_model')}
          renderField={({ fieldProps }) => (
            <NativeSelect {...fieldProps} onChange={(e) => fieldProps.onChange(e.target.value)}>
              {dataModels.map((element) => (
                <option key={element} value={element}>
                  {element}
                </option>
              ))}
            </NativeSelect>
          )}
        />
      ) : (
        // <SelectDataModelComponent
        //   dataModelFieldsFilter={getDataModelFieldsFilter(component.type, bindingKey === 'list')}
        //   helpText={helpText}
        //   inputId={`selectDataModelSelect-${bindingKey}`}
        //   label={t('ux_editor.modal_properties_data_model_selected')}
        //   onDataModelChange={onBindingChange}
        //   propertyPath={propertyPath}
        //   selectedElement={dataModelName}
        // />
        <StudioDisplayTile
          label={t('ux_editor.modal_properties_data_model')}
          value={dataModelName}
          className={classes.displayTileContainer}
        />
      )}
      <SelectDataModelComponent
        dataModelFieldsFilter={getDataModelFieldsFilter(component.type, bindingKey === 'list')}
        helpText={helpText}
        inputId={`selectDataModelSelect-${bindingKey}`}
        label={t('ux_editor.modal_properties_data_model_binding')}
        onDataModelChange={onBindingChange}
        propertyPath={propertyPath}
        selectedElement={selectedElement}
      />
      <div className={classes.buttons}>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={onClose}
          size='small'
          title={t('general.close')}
          variant='secondary'
        />
        <StudioDeleteButton
          confirmMessage={t('right_menu.data_model_bindings_delete_confirm')}
          onDelete={onDelete}
          size='small'
          title={t('general.delete')}
        />
      </div>
    </Fieldset>
  );
};
