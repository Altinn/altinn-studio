import React from 'react';
import { Select } from '@digdir/design-system-react';
import { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
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

  return (
    <div>
      <Select
        options={
          Array.isArray(optionList)
            ? optionList.map((option) => ({
                label: option,
                value: option,
              }))
            : []
        }
        label={t('ux_editor.modal_properties_code_list_id')}
        onChange={handleOptionsIdChange}
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
