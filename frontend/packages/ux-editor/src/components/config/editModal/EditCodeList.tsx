import React from 'react';
import { TextField } from '@digdir/design-system-react';
import { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import type {
  FormCheckboxesComponent,
  FormRadioButtonsComponent,
} from '../../../types/FormComponent';
import Select from 'react-select';

export enum SelectedOptionsType {
  Codelist = 'codelist',
  Manual = 'manual',
  Unknown = '',
}

export function EditCodeList({ component, handleComponentChange }: IGenericEditComponent) {
  const t = useText();
  const [selectedOption, setSelectedOption] = React.useState(null);
  const [previousOptions, setPreviousOptions] = React.useState([]);

  /* 
  const handleOptionsIdChange = (selectedOption) => {
  const optionsId = selectedOption.value;
  setSelectedOption(selectedOption);
  setPreviousOptions([...previousOptions, optionsId]);

  handleComponentChange({
    ...component,
    optionsId: optionsId,
  });
};
 */
  const handleOptionsIdChange = (e: any) => {
    handleComponentChange({
      ...component,
      optionsId: e.target.value,
    });
  };

  return (
    <div>
      <div>
        {t('ux_editor.modal_properties_code_list_id')}
        <Select
          id='modal-properties-code-list-id'
          onChange={handleOptionsIdChange}
          /*value={selectedOption}
       options={previousOptions.map((option) => ({ value: option, label: option }))} */
        />
      </div>
      {/* 
      <TextField
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
