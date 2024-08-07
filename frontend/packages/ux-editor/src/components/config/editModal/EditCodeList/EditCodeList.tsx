import React, { useEffect, useState } from 'react';
import { Alert, Textfield, ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useOptionListIdsQuery } from '../../../../hooks/queries/useOptionListIdsQuery';
import { useTranslation, Trans } from 'react-i18next';
import { StudioButton, StudioNativeSelect, StudioSpinner } from '@studio/components';

import { altinnDocsUrl } from 'app-shared/ext-urls';
import { FormField } from '../../../FormField';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './EditCodeList.module.css';
import type { ComponentType } from 'app-shared/types/ComponentType';

export function EditCodeList<
  T extends ComponentType.Checkboxes | ComponentType.RadioButtons | ComponentType.Dropdown,
>({ component, handleComponentChange }: IGenericEditComponent<T>) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

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
              key={component.id}
              id={component.id}
              label={t('ux_editor.modal_properties_code_list_id')}
              onChange={handleOptionsIdChange}
              value={component.optionsId}
              propertyPath={`${component.propertyPath}/properties/optionsId`}
              renderField={({ fieldProps }) => (
                <StudioNativeSelect
                  onChange={(e) => fieldProps.onChange(e.target.value)}
                  value={fieldProps.value}
                >
                  <option hidden value=''>
                    {t('ux_editor.modal_properties_code_list_helper')}
                  </option>
                  {optionListIds.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </StudioNativeSelect>
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
