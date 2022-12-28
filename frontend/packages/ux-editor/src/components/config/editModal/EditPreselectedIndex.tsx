import React from 'react';
import { getLanguageFromKey } from 'app-shared/utils/language';
import type {
  IFormGenericOptionsComponent,
} from '../../../types/global';
import { TextField } from '@altinn/altinn-design-system';
import { IGenericEditComponent } from '../componentConfig';

export function EditPreselectedIndex({ component, handleComponentChange, language }: IGenericEditComponent) {
  const t = (key: string) => getLanguageFromKey(key, language);

  const handlePreselectedOptionChange = (e: any) => {
    handleComponentChange({
      ...component,
      preselectedOptionIndex: Number(e.target.value),
    });
  };

  return (
    <div>
      <TextField
        defaultValue={(component as IFormGenericOptionsComponent).preselectedOptionIndex}
        formatting={{ number: {} }}
        label={
          component.type === 'Checkboxes'
            ? t('ux_editor.modal_check_box_set_preselected')
            : t('ux_editor.modal_radio_button_set_preselected')
        }
        onChange={handlePreselectedOptionChange}
        placeholder={t('ux_editor.modal_selection_set_preselected_placeholder')}
      />
    </div>

  );
}
