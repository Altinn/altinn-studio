import React from 'react';
import { TextField, Select } from '@digdir/design-system-react';
import { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import type {
  FormCheckboxesComponent,
  FormRadioButtonsComponent,
} from '../../../types/FormComponent';
import { useOptionListQuery } from '../../../../../ux-editor/src/hooks/queries/useOptionListQuery';
import { useParams } from 'react-router-dom';

export enum SelectedOptionsType {
  Codelist = 'codelist',
  Manual = 'manual',
  Unknown = '',
}

export function EditCodeList({ component, handleComponentChange }: IGenericEditComponent) {
  const t = useText();
  const { org, app } = useParams();
  const { data: optionList } = useOptionListQuery(org, app);
  const handleOptionsIdChange = (e: any) => {
    handleComponentChange({
      ...component,
      optionsId: e.target.value,
    });
  };

  console.log(optionList);

  return (
    <div>
      <Select
        options={
          Array.isArray(optionList)
            ? optionList.map((option) => ({
                label: option.name,
                value: option.id,
              }))
            : []
        }
        label={t('ux_editor.modal_properties_code_list_id')}
        onChange={handleOptionsIdChange}
      />

      {/*     <TextField
        id='modal-properties-code-list-id'
        label={t('ux_editor.modal_properties_code_list_id')}
        onChange={handleOptionsIdChange}
        value={(component as FormCheckboxesComponent | FormRadioButtonsComponent).optionsId || ''}
      /> */}
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
