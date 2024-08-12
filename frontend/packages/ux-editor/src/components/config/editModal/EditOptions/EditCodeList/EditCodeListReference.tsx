import React from 'react';
import type { IGenericEditComponent } from '../../../componentConfig';
import { useTranslation, Trans } from 'react-i18next';

import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './EditCodeList.module.css';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { StudioParagraph, StudioTextfield } from '@studio/components';

export function EditCodeListReference<
  T extends ComponentType.Checkboxes | ComponentType.RadioButtons | ComponentType.Dropdown,
>({ component, handleComponentChange }: IGenericEditComponent<T>) {
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
    <div className={classes.root}>
      <StudioParagraph spacing>
        {t('ux_editor.options.codelist_referenceId.description')}
      </StudioParagraph>
      <StudioParagraph spacing>
        {t('ux_editor.options.codelist_referenceId.description_details')}
      </StudioParagraph>
      <StudioTextfield
        type='text'
        label={t('ux_editor.modal_properties_custom_code_list_id')}
        onChange={(event) => handleOptionsIdChange(event.target.value)}
        value={component.optionsId}
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
