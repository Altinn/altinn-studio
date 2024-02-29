import React from 'react';
import { SelectDataModelComponent } from '../../../SelectDataModelComponent';
import { getDataModelFieldsFilter } from '../../../../../utils/datamodel';
import type { FormItem } from '../../../../../types/FormItem';
import { StudioButton, StudioDeleteButton } from '@studio/components';
import { XMarkIcon } from '@studio/icons';
import classes from './EditBinding.module.css';
import { useTranslation } from 'react-i18next';

export type EditBindingProps = {
  bindingKey: string;
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

  return (
    <fieldset className={classes.editBinding}>
      <legend className={classes.legend}>{label}</legend>
      <SelectDataModelComponent
        dataModelFieldsFilter={getDataModelFieldsFilter(component.type, label === 'list')}
        helpText={helpText}
        inputId={`selectDataModelSelect-${label}`}
        label={label}
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
          confirmMessage={t('right_menu.dataModelBindings_delete_confirm')}
          onDelete={onDelete}
          size='small'
          title={t('general.delete')}
        />
      </div>
    </fieldset>
  );
};
