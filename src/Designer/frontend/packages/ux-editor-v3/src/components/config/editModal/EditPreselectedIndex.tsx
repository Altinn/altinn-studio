import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type {
  FormCheckboxesComponent,
  FormRadioButtonsComponent,
} from '../../../types/FormComponent';
import { FormField } from '../../FormField';
import { StudioTextfield } from '@studio/components';

export function EditPreselectedIndex({ component, handleComponentChange }: IGenericEditComponent) {
  const t = useText();

  const handlePreselectedOptionChange = (preselectedOptionIndex: number) => {
    handleComponentChange({
      ...component,
      preselectedOptionIndex,
    });
  };

  const mapComponentTypeToText = (componentType: ComponentTypeV3) => {
    switch (componentType) {
      case ComponentTypeV3.Checkboxes:
        return t('ux_editor.modal_check_box_set_preselected');
      case ComponentTypeV3.RadioButtons:
        return t('ux_editor.modal_radio_button_set_preselected');
      case ComponentTypeV3.Dropdown:
        return t('ux_editor.component_dropdown_set_preselected');
      default:
        return 'Unknown component';
    }
  };

  return (
    <FormField
      id={component.id}
      label={mapComponentTypeToText(component.type)}
      value={
        (component as FormCheckboxesComponent | FormRadioButtonsComponent).preselectedOptionIndex
      }
      onChange={handlePreselectedOptionChange}
      propertyPath={`${component.propertyPath}/properties/preselectedOptionIndex`}
      renderField={({ fieldProps }) => (
        <StudioTextfield
          {...fieldProps}
          type='number'
          placeholder={t('ux_editor.modal_selection_set_preselected_placeholder')}
          onChange={(e) => fieldProps.onChange(parseInt(e.target.value), e)}
        />
      )}
    />
  );
}
