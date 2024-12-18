import React from 'react';
import type { IGenericEditComponent } from '../../../../componentConfig';
import { useTranslation, Trans } from 'react-i18next';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { StudioAlert, StudioParagraph, StudioSpinner, StudioTextfield } from '@studio/components';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import { useOptionListIdsQuery } from '../../../../../../hooks/queries/useOptionListIdsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export function ReferenceTab({
  component,
  handleComponentChange,
}: IGenericEditComponent<SelectionComponentType>) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, isPending } = useOptionListIdsQuery(org, app);

  const handleOptionsIdChange = (optionsId: string) => {
    if (component.options) {
      delete component.options;
    }
    handleComponentChange({
      ...component,
      optionsId,
    });
  };

  if (isPending) {
    return (
      <StudioSpinner
        showSpinnerTitle={false}
        spinnerTitle={t('ux_editor.modal_properties_loading')}
      />
    );
  }

  const isOptionsIdInLibrary = optionListIds?.some(
    (optionId: string) => optionId == component.optionsId,
  );

  return (
    <>
      <StudioParagraph spacing size='small'>
        {t('ux_editor.options.code_list_referenceId.description')}
      </StudioParagraph>
      <StudioParagraph spacing size='small'>
        {t('ux_editor.options.code_list_referenceId.description_details')}
      </StudioParagraph>
      <StudioTextfield
        type='text'
        label={t('ux_editor.modal_properties_custom_code_list_id')}
        onChange={(event) => handleOptionsIdChange(event.target.value)}
        value={component.optionsId}
        size='small'
      />
      {(isOptionsIdInLibrary || component.options) && (
        <StudioAlert severity={'info'} size='sm'>
          {t('ux_editor.options.tab_referenceid_alert_title')}
        </StudioAlert>
      )}
      <p>
        <Trans i18nKey={'ux_editor.modal_properties_code_list_read_more'}>
          <a
            href={altinnDocsUrl({ relativeUrl: 'altinn-studio/guides/options/dynamic-codelists/' })}
            target='_newTab'
            rel='noopener noreferrer'
          />
        </Trans>
      </p>
    </>
  );
}
