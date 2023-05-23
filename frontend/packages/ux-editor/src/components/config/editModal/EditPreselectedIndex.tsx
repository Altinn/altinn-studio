import React from 'react';
import { TextField } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormItemType } from 'app-shared/types/FormItemType';
import { FormCheckboxesComponent, FormRadioButtonsComponent } from '../../../types/FormComponent';

export function EditPreselectedIndex({ component, handleComponentChange }: IGenericEditComponent) {
  const t = useText();

  const handlePreselectedOptionChange = (e: any) => {
    handleComponentChange({
      ...component,
      preselectedOptionIndex: Number(e.target.value),
    });
  };

  const mapComponentTypeToText = (componentType: FormItemType) => {
    switch (componentType) {
      case FormItemType.Checkboxes:
        return t('ux_editor.modal_check_box_set_preselected');
      case FormItemType.RadioButtons:
        return t('ux_editor.modal_radio_button_set_preselected');
      case FormItemType.Dropdown:
        return t('ux_editor.component_dropdown_set_preselected');
      default:
        return 'Unknown component';
    }
  }

  return (
    <div>
      <TextField
        defaultValue={(component as FormCheckboxesComponent | FormRadioButtonsComponent).preselectedOptionIndex}
        formatting={{ number: {} }}
        label={mapComponentTypeToText(component.type as FormItemType)}
        onChange={handlePreselectedOptionChange}
        placeholder={t('ux_editor.modal_selection_set_preselected_placeholder')}
      />
    </div>
  );
}
