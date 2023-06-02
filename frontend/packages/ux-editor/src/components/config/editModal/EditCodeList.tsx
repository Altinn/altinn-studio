import React from 'react';
import { Select } from '@digdir/design-system-react';
import { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { useOptionListIdsQuery } from '../../../hooks/queries/useOptionListIdsQuery';
import { useParams } from 'react-router-dom';
import { AltinnSpinner } from 'app-shared/components';
import { ErrorMessage } from '@digdir/design-system-react';

export enum SelectedOptionsType {
  Codelist = 'codelist',
  Manual = 'manual',
  Unknown = '',
}

export function EditCodeList({ component, handleComponentChange }: IGenericEditComponent) {
  const t = useText();
  const { org, app } = useParams();

  const {
    data: optionListIds,
    isLoading: isLoadingCodeList,
    error: isError,
  } = useOptionListIdsQuery(org, app);
  const handleOptionsIdChange = (e: any) => {
    handleComponentChange({
      ...component,
      optionsId: e.target.value,
    });
  };

  return (
    <div>
      {isLoadingCodeList ? (
        <AltinnSpinner />
      ) : isError ? (
        <ErrorMessage>{t('ux_editor.modal_properties_error_message')}</ErrorMessage>
      ) : (
        <Select
          options={optionListIds.map((option) => ({
            label: option,
            value: option,
          }))}
          label={t('ux_editor.modal_properties_code_list_id')}
          onChange={handleOptionsIdChange}
        />
      )}

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
