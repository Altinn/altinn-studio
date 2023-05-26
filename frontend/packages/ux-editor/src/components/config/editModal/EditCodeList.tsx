import React from 'react';
import { TextField } from '@digdir/design-system-react';
import { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import type { FormCheckboxesComponent, FormRadioButtonsComponent } from '../../../types/FormComponent';

export function EditCodeList({ component, handleComponentChange }: IGenericEditComponent) {
  const t = useText();

  const handleOptionsIdChange = (e: any) => {
    handleComponentChange({
      ...component,
      optionsId: e.target.value,
    });
  };

  return (
    <div>
      <TextField
        id='modal-properties-code-list-id'
        label={t('ux_editor.modal_properties_code_list_id')}
        onChange={handleOptionsIdChange}
        value={(component as FormCheckboxesComponent | FormRadioButtonsComponent).optionsId || ''}
      />
      <p>
        <a
          target='_blank'
          rel='noopener noreferrer'
          href='https://docs.altinn.studio/app/development/data/options/'
        >
          {t('ux_editor.modal_properties_code_list_read_more')}
        </a>
      </p>
    </div>
  );
}
