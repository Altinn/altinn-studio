import React, { useEffect, useState } from 'react';
import { Alert, LegacySelect, Textfield, ErrorMessage } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useOptionListIdsQuery } from '../../../../hooks/queries/useOptionListIdsQuery';
import { useTranslation, Trans } from 'react-i18next';
import { StudioButton, StudioSpinner } from '@studio/components';

import { altinnDocsUrl } from 'app-shared/ext-urls';
import { FormField } from '../../../FormField';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import classes from './EditCodeList.module.css';
import type { ComponentType } from 'app-shared/types/ComponentType';

export function EditCodeList<
  T extends ComponentType.Checkboxes | ComponentType.RadioButtons | ComponentType.Dropdown,
>({ component, handleComponentChange }: IGenericEditComponent<T>) {
  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();

  const { data: optionListIds, isPending, isError, error } = useOptionListIdsQuery(org, app);
  const [useCustomCodeList, setUseCustomCodeList] = useState<boolean>(optionListIds?.length === 0);
  const handleOptionsIdChange = (optionsId: string) => {
    handleComponentChange({
      ...component,
      optionsId,
    });
  };

  useEffect(() => {
    if (!optionListIds) return;
    setUseCustomCodeList(optionListIds?.length === 0);
  }, [optionListIds]);

  return (
    <div className={classes.root}>
      {isPending ? (
        <StudioSpinner
          showSpinnerTitle={false}
          spinnerTitle={t('ux_editor.modal_properties_loading')}
        />
      ) : isError ? (
        <ErrorMessage>
          {error instanceof Error ? error.message : t('ux_editor.modal_properties_error_message')}
        </ErrorMessage>
      ) : optionListIds?.length === 0 ? (
        <Alert severity='info'>{t('ux_editor.modal_properties_no_options_found_message')}</Alert>
      ) : (
        <>
          <p>
            <StudioButton
              variant='tertiary'
              onClick={() => setUseCustomCodeList(!useCustomCodeList)}
              size='small'
              className={classes.customOrStaticButton}
            >
              {optionListIds?.length > 0 && useCustomCodeList && (
                <>{t('ux_editor.properties_panel.options.codelist_switch_to_static')}</>
              )}
              {!useCustomCodeList && (
                <>{t('ux_editor.properties_panel.options.codelist_switch_to_custom')}</>
              )}
            </StudioButton>
          </p>

          {!useCustomCodeList && (
            <FormField
              id={component.id}
              label={t('ux_editor.modal_properties_code_list_id')}
              onChange={handleOptionsIdChange}
              value={component.optionsId}
              propertyPath={`${component.propertyPath}/properties/optionsId`}
              renderField={({ fieldProps }) => (
                <LegacySelect
                  {...fieldProps}
                  options={optionListIds.map((option) => ({
                    label: option,
                    value: option,
                  }))}
                />
              )}
            />
          )}
        </>
      )}
      {
        <>
          {useCustomCodeList && (
            <Textfield
              type='text'
              label={t('ux_editor.modal_properties_custom_code_list_id')}
              onChange={(event) => handleOptionsIdChange(event.target.value)}
              value={component.optionsId}
            />
          )}
        </>
      }
      <p style={{ marginBottom: 0 }}>
        <Trans i18nKey={'ux_editor.modal_properties_code_list_read_more'}>
          <a
            href={altinnDocsUrl('app/development/data/options/')}
            target='_newTab'
            rel='noopener noreferrer'
          />
        </Trans>
      </p>
    </div>
  );
}
