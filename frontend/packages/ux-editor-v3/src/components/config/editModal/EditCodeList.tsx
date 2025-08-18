import React, { useState } from 'react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useOptionListIdsQuery } from '../../../hooks/queries/useOptionListIdsQuery';
import { useTranslation, Trans } from 'react-i18next';
import { StudioButton } from '@studio/components';
import { StudioNativeSelect, StudioSpinner, StudioTextfield } from '@studio/components-legacy';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { FormField } from '../../FormField';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export function EditCodeList({ component, handleComponentChange }: IGenericEditComponent) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const { data: optionListIds, isPending, isError } = useOptionListIdsQuery(org, app);
  const [useCustomCodeList, setUseCustomCodeList] = useState<boolean>(optionListIds?.length === 0);
  const handleOptionsIdChange = (e) => {
    handleComponentChange({
      ...component,
      optionsId: e,
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
          {t('ux_editor.modal_properties_fetch_option_list_ids_error_message')}
        </ErrorMessage>
      ) : optionListIds?.length === 0 ? (
        <ErrorMessage>{t('ux_editor.modal_properties_no_options_found_message')}</ErrorMessage>
      ) : (
        <>
          <p>
            <StudioButton
              variant='tertiary'
              onClick={() => setUseCustomCodeList(!useCustomCodeList)}
            >
              asdf
              {optionListIds?.length > 0 && useCustomCodeList && <>Bytt til statisk kodeliste</>}
              {!useCustomCodeList && <>Bytt til egendefinert kodeliste</>}
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
                <StudioNativeSelect {...fieldProps}>
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
            <StudioTextfield
              type='text'
              label={t('ux_editor.modal_properties_custom_code_list_id')}
              onChange={(event) => handleOptionsIdChange(event)}
              value={component.optionsId}
            />
          )}
        </>
      }
      <p style={{ marginBottom: 0 }}>
        <Trans i18nKey={'ux_editor.modal_properties_code_list_read_more'}>
          <a
            href={altinnDocsUrl({ relativeUrl: 'altinn-studio/guides/development/options/' })}
            target='_newTab'
            rel='noopener noreferrer'
          />
        </Trans>
      </p>
    </div>
  );
}
