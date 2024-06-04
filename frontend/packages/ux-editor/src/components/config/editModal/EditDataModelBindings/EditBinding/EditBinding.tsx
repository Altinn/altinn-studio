import React from 'react';
import { SelectDataModelComponent } from '../../../SelectDataModelComponent';
import { getDataModelFieldsFilter } from '../../../../../utils/dataModel';
import type { FormItem } from '../../../../../types/FormItem';
import { StudioButton, StudioDeleteButton, StudioLabelAsParagraph } from '@studio/components';
import { XMarkIcon } from '@studio/icons';
import classes from './EditBinding.module.css';
import { useTranslation } from 'react-i18next';
import { Fieldset, NativeSelect, Paragraph } from '@digdir/design-system-react';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

export type EditBindingProps = {
  bindingKey: string;
  dataModelName: string;
  component: FormItem;
  helpText: string;
  label: string;
  onBindingChange: (binding: string) => void;
  onClose: () => void;
  onDelete: () => void;
  selectedElement: string;
};

export const EditBinding = ({
  bindingKey,
  dataModelName,
  component,
  helpText,
  label,
  onBindingChange,
  onClose,
  onDelete,
  selectedElement,
}: EditBindingProps) => {
  const { t } = useTranslation();
  const propertyPath = `definitions/component/properties/dataModelBindings/properties/${bindingKey}`;
  const shouldDisplayDataModelSelector = shouldDisplayFeature('dataModelBindingSelector');

  return (
    <Fieldset legend={label} className={classes.editBinding} size='small'>
      {/* <div> */}
      <StudioLabelAsParagraph size='small'>
        {t('ux_editor.modal_properties_data_model_selected')}
      </StudioLabelAsParagraph>
      {shouldDisplayDataModelSelector ? (
        <NativeSelect
          id={`selectDataModelSelect-${bindingKey}`}
          onChange={(e) => onBindingChange(e.target.value)}
          value={selectedElement}
        >
          <option value={selectedElement}>{dataModelName}</option>
        </NativeSelect>
      ) : (
        <Paragraph size='small'>{dataModelName}</Paragraph>
      )}
      {/* </div> */}
      <SelectDataModelComponent
        dataModelFieldsFilter={getDataModelFieldsFilter(component.type, bindingKey === 'list')}
        helpText={helpText}
        inputId={`selectDataModelSelect-${bindingKey}`}
        label={t('ux_editor.modal_properties_data_model_selected_binding')}
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
