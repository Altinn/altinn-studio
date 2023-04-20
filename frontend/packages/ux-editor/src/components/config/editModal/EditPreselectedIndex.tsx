import React from 'react';
import type { IFormGenericOptionsComponent } from '../../../types/global';
import { TextField } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { ComponentType } from '../../';

export function EditPreselectedIndex({ component, handleComponentChange }: IGenericEditComponent) {
  const t = useText();

  const handlePreselectedOptionChange = (e: any) => {
    handleComponentChange({
      ...component,
      preselectedOptionIndex: Number(e.target.value),
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
  }

  return (
    <div>
      <TextField
        defaultValue={(component as IFormGenericOptionsComponent).preselectedOptionIndex}
        formatting={{ number: {} }}
        label={mapComponentTypeToText(component.type as ComponentType)}
        onChange={handlePreselectedOptionChange}
        placeholder={t('ux_editor.modal_selection_set_preselected_placeholder')}
      />
    </div>
  );
}
