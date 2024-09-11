import React from 'react';
import type { IGenericEditComponent } from '../../../componentConfig';
import { useTranslation, Trans } from 'react-i18next';

import { altinnDocsUrl } from 'app-shared/ext-urls';
import { StudioParagraph, StudioTextfield } from '@studio/components';
import type { SelectionComponentType } from '../../../../../types/FormComponent';

export function EditCodeListReference<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) {
  const { t } = useTranslation();

  const handleOptionsIdChange = (optionsId: string) => {
    if (component.options) {
      delete component.options;
    }
    handleComponentChange({
      ...component,
      optionsId,
    });
  };

  return (
    <div>
      <StudioParagraph spacing size='small'>
        {t('ux_editor.options.codelist_referenceId.description')}
      </StudioParagraph>
      <StudioParagraph spacing size='small'>
        {t('ux_editor.options.codelist_referenceId.description_details')}
      </StudioParagraph>
      <StudioTextfield
        type='text'
        label={t('ux_editor.modal_properties_custom_code_list_id')}
        onChange={(event) => handleOptionsIdChange(event.target.value)}
        value={component.optionsId}
        size='small'
      />
      <p style={{ marginBottom: 0 }}>
        <Trans i18nKey={'ux_editor.modal_properties_code_list_read_more'}>
          <a
            href={altinnDocsUrl('altinn-studio/guides/options/dynamic-codelists/')}
            target='_newTab'
            rel='noopener noreferrer'
          />
        </Trans>
      </p>
    </div>
  );
}
