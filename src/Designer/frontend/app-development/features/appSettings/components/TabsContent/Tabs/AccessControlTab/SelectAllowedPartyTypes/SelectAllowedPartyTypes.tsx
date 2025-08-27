import React from 'react';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import classes from './SelectAllowedPartyTypes.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  StudioFormGroup,
  StudioCheckboxTable,
  useStudioCheckboxTable,
  StudioButton,
} from '@studio/components';
import type {
  AllowedPartyTypes,
  ApplicationMetadata,
  PartyTypesAllowed,
} from 'app-shared/types/ApplicationMetadata';
import {
  getPartyTypesAllowedOptions,
  getSelectedPartyTypes,
  mapSelectedValuesToPartyTypesAllowed,
} from './utils';
import { useAppMetadataMutation } from '../../../../../../../hooks/mutations';
import { CheckmarkIcon, XMarkIcon } from '@studio/icons';
import { toast } from 'react-toastify';
import { ArrayUtils } from '@studio/pure-functions';

export type SelectAllowedPartyTypesProps = {
  appMetadata: ApplicationMetadata;
};

export function SelectAllowedPartyTypes({
  appMetadata,
}: SelectAllowedPartyTypesProps): ReactElement {
  const { t } = useTranslation();

  const partyTypesAllowed: PartyTypesAllowed = appMetadata.partyTypesAllowed;

  const initialValues: AllowedPartyTypes[] = getSelectedPartyTypes(partyTypesAllowed);
  const title: string = t('app_settings.access_control_tab_option_all_types');
  const minimimumRequiredCheckboxes: number = 1;

  const { hasError, getCheckboxProps, selectedValues, setSelectedValues } = useStudioCheckboxTable(
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
      <ActionsButtons
        appMetadata={appMetadata}
        selectedValues={selectedValues}
        hasError={hasError}
        initialValues={initialValues}
        setSelectedValues={setSelectedValues}
      />
    </StudioFormGroup>
  );
}

type ActionsButtonsProps = {
  appMetadata: ApplicationMetadata;
  selectedValues: string[];
  hasError: boolean;
  initialValues: AllowedPartyTypes[];
  setSelectedValues: Dispatch<SetStateAction<string[]>>;
};
function ActionsButtons({
  appMetadata,
  selectedValues,
  initialValues,
  hasError,
  setSelectedValues,
}: ActionsButtonsProps): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const isNewValuesSameAsInitialValues: boolean = ArrayUtils.arraysEqualUnordered(
    initialValues,
    selectedValues,
  );
  const buttonDisabled: boolean = hasError || isNewValuesSameAsInitialValues;
  const resetButtonDisabled: boolean = isNewValuesSameAsInitialValues;

  const savePartyTypesAllowed = (): void => {
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

  const resetPartyTypesAllowed = (): void => {
    setSelectedValues(initialValues);
  };

  return (
    <div className={classes.buttonContainer}>
      <StudioButton
        onClick={savePartyTypesAllowed}
        disabled={buttonDisabled}
        icon={<CheckmarkIcon />}
      >
        {t('app_settings.access_control_tab_save_options')}
      </StudioButton>
      <StudioButton
        variant='secondary'
        disabled={resetButtonDisabled}
        onClick={resetPartyTypesAllowed}
        icon={<XMarkIcon />}
      >
        {t('app_settings.access_control_tab_reset_options')}
      </StudioButton>
    </div>
  );
}
