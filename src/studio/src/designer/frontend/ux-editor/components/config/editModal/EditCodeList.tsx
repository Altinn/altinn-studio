import React from 'react';
import { useSelector } from 'react-redux';
import { getLanguageFromKey } from 'app-shared/utils/language';
import type {
  IAppState,
  IFormGenericOptionsComponent,
} from '../../../types/global';
import { TextField } from '@altinn/altinn-design-system';
import { IGenericEditComponent } from '../componentConfig';

export enum SelectedOptionsType {
  Codelist = 'codelist',
  Manual = 'manual',
  Unknown = '',
}

export function EditCodeList({ component, handleComponentChange }: IGenericEditComponent) {
  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  const t = (key: string) => getLanguageFromKey(key, language);

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
        value={(component as IFormGenericOptionsComponent).optionsId || ''}
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
