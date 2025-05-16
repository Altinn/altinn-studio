import React from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  StudioFormGroup,
  StudioCheckboxTable,
  useStudioCheckboxTableLogic,
  StudioButton,
} from '@studio/components';
import type { AllowedPartyTypes, ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import {
  getPartyTypesAllowedOptions,
  getSelectedPartyTypes,
  mapSelectedValuesToPartyTypesAllowed,
} from './utils';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { CheckmarkIcon } from '@studio/icons';
import { toast } from 'react-toastify';

export type SelectAllowedPartyTypesProps = {
  appMetadata: ApplicationMetadata;
};

export function SelectAllowedPartyTypes({
  appMetadata,
}: SelectAllowedPartyTypesProps): ReactElement {
  const { t } = useTranslation();

  const partyTypesAllowed = appMetadata.partyTypesAllowed;

  const initialValues: AllowedPartyTypes[] = getSelectedPartyTypes(partyTypesAllowed);
  const title: string = t('app_settings.access_control_tab_option_all_types');
  const minimimumRequiredCheckboxes: number = 1;

  const { hasError, getCheckboxProps, selectedValues } = useStudioCheckboxTableLogic(
    initialValues,
    title,
    minimimumRequiredCheckboxes,
  );

  return (
    <StudioFormGroup
      legend={t('app_settings.access_control_tab_checkbox_legend_label')}
      description={t('app_settings.access_control_tab_checkbox_description')}
    >
      <StudioCheckboxTable
        hasError={hasError}
        errorMessage={t('app_settings.access_control_tab_option_choose_type_modal_message')}
      >
        <StudioCheckboxTable.Head
          title={title}
          getCheckboxProps={{
            ...getCheckboxProps({
              allowIndeterminate: true,
              value: 'all',
            }),
          }}
        />
        <StudioCheckboxTable.Body>
          {getPartyTypesAllowedOptions().map((mappedOption) => (
            <StudioCheckboxTable.Row
              key={mappedOption.value}
              label={t(mappedOption.label)}
              getCheckboxProps={{
                ...getCheckboxProps({
                  value: mappedOption.value.toString(),
                  name: t(mappedOption.label),
                }),
              }}
            />
          ))}
        </StudioCheckboxTable.Body>
      </StudioCheckboxTable>
      <SaveButton appMetadata={appMetadata} selectedValues={selectedValues} hasError={hasError} />
    </StudioFormGroup>
  );
}

type SaveButtonProps = {
  appMetadata: ApplicationMetadata;
  selectedValues: string[];
  hasError: boolean;
};
function SaveButton({ appMetadata, selectedValues, hasError }: SaveButtonProps): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const savePartyTypesAllowed = () => {
    const listIsEmpty: boolean = selectedValues.length === 0;
    if (listIsEmpty) {
      return;
    }
    const updatedPartyTypesAllowed = mapSelectedValuesToPartyTypesAllowed(selectedValues);
    updateAppMetadataMutation(
      {
        ...appMetadata,
        partyTypesAllowed: updatedPartyTypesAllowed,
      },
      {
        onSuccess: () => {
          toast.success(t('app_settings.access_control_tab_save_options_success_message'));
        },
        onError: () => {
          toast.error(t('app_settings.access_control_tab_save_options_error_message'));
        },
      },
    );
  };

  return (
    <StudioButton onClick={savePartyTypesAllowed} disabled={hasError} icon={<CheckmarkIcon />}>
      {t('app_settings.access_control_tab_save_options')}
    </StudioButton>
  );
}
