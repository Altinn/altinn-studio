import React from 'react';
import { Textfield } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  FormCheckboxesComponent,
  FormRadioButtonsComponent,
} from '../../../types/FormComponent';
import { FormField } from '../../FormField';

export function EditPreselectedIndex({ component, handleComponentChange }: IGenericEditComponent) {
  const t = useText();

  const handlePreselectedOptionChange = (preselectedOptionIndex: number) => {
    handleComponentChange({
      ...component,
      preselectedOptionIndex,
    });
  };

  const mapComponentTypeToText = (componentType: ComponentType) => {
    switch (componentType) {
      case ComponentType.Checkboxes:
        return t('ux_editor.modal_check_box_set_preselected');
      case ComponentType.RadioButtons:
        return t('ux_editor.modal_radio_button_set_preselected');
      case ComponentType.Dropdown:
        return t('ux_editor.component_dropdown_set_preselected');
      default:
        return 'Unknown component';
    }
  };

  return (
    <FormField
      id={component.id}
      label={mapComponentTypeToText(component.type as ComponentType)}
      value={
        (component as FormCheckboxesComponent | FormRadioButtonsComponent).preselectedOptionIndex
      }
      onChange={handlePreselectedOptionChange}
      propertyPath={`${component.propertyPath}/properties/preselectedOptionIndex`}
      renderField={({ fieldProps }) => (
        <Textfield
          {...fieldProps}
          type='number'
          placeholder={t('ux_editor.modal_selection_set_preselected_placeholder')}
          onChange={(e) => fieldProps.onChange(parseInt(e.target.value), e)}
        />
      )}
    />
  );
}
