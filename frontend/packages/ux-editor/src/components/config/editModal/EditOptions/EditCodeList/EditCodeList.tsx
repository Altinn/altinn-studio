import React from 'react';
import { Alert, ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../../componentConfig';
import { useOptionListIdsQuery } from '../../../../../hooks/queries/useOptionListIdsQuery';
import { useTranslation, Trans } from 'react-i18next';
import { StudioNativeSelect, StudioSpinner } from '@studio/components';

import { altinnDocsUrl } from 'app-shared/ext-urls';
import { FormField } from '../../../../FormField';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { ManualCodelistUploadSteps } from './ManualCodelistUploadSteps';
import type { SelectionComponentType } from '../../../../../types/FormComponent';

export function EditCodeList<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const { data: optionListIds, isPending, isError, error } = useOptionListIdsQuery(org, app);

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
        <>
          <Alert severity='info' size='small'>
            {t('ux_editor.modal_properties_no_options_found_message')}
          </Alert>
          <ManualCodelistUploadSteps />
        </>
      ) : (
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
      <p style={{ marginBottom: 0 }}>
        <Trans i18nKey={'ux_editor.modal_properties_code_list_read_more_static'}>
          <a
            href={altinnDocsUrl({ relativeUrl: 'altinn-studio/guides/options/static-codelists/' })}
            target='_newTab'
            rel='noopener noreferrer'
          />
        </Trans>
      </p>
    </div>
  );
}
