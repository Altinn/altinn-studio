import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { TabPageWrapper } from '../../TabPageWrapper';
import { TabPageHeader } from '../../TabPageHeader';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import {
  StudioFormGroup,
  StudioValidationMessage,
  StudioCheckboxTable,
  useStudioCheckboxTableLogic,
} from '@studio/components';
import type {
  AllowedPartyTypes,
  ApplicationMetadata,
  PartyTypesAllowed,
} from 'app-shared/types/ApplicationMetadata';
import { getPartyTypesAllowedOptions, getSelectedPartyTypes, partyTypesAllowedMap } from './utils';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';

export function AccessControlTab(): ReactElement {
  const { t } = useTranslation();
  return (
    <TabPageWrapper>
      <TabPageHeader text={t('app_settings.access_control_tab_heading')} />
      <AccessControlTabContent />
    </TabPageWrapper>
  );
}

function AccessControlTabContent(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const {
    data: appMetadata,
    status: appMetadataStatus,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  switch (appMetadataStatus) {
    case 'pending': {
      return <LoadingTabData />;
    }
    case 'error': {
      return (
        <TabDataError>
          {appMetadataError && (
            <StudioValidationMessage>{appMetadataError.message}</StudioValidationMessage>
          )}
        </TabDataError>
      );
    }
    case 'success': {
      return <SelectAllowedPartyTypes appMetadata={appMetadata} />;
    }
  }
}

type SelectAllowedPartyTypesProps = {
  appMetadata: ApplicationMetadata;
};

function SelectAllowedPartyTypes({ appMetadata }: SelectAllowedPartyTypesProps): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const partyTypesAllowed = appMetadata.partyTypesAllowed;
  const initialValues: AllowedPartyTypes[] = getSelectedPartyTypes(partyTypesAllowed);
  const title: string = t('settings_modal.access_control_tab_option_all_types'); // TODO
  const minimimumRequiredCheckboxes: number = 1;

  const { hasError, getCheckboxProps, selectedValues } = useStudioCheckboxTableLogic(
    initialValues,
    title,
    minimimumRequiredCheckboxes,
  );

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const savePartyTypesAllowed = (e: ChangeEvent<HTMLInputElement>) => {
    // What to do når man klikker på all?!?!?

    const updatedSelectedValues = getUpdatedSelectedValues(
      selectedValues,
      e.target.value,
      e.target.checked,
    );

    const listIsEmpty: boolean = updatedSelectedValues.length === 0;
    if (listIsEmpty) {
      return;
    }

    const updatedPartyTypesAllowed: PartyTypesAllowed =
      mapSelectedValuesToPartyTypesAllowed(updatedSelectedValues);

    updateAppMetadataMutation({
      ...appMetadata,
      partyTypesAllowed: updatedPartyTypesAllowed,
    });
  };

  // TODO - remember error when trying to remove all
  return (
    <StudioFormGroup
      legend={t('settings_modal.access_control_tab_checkbox_legend_label')} // TODO
      description={t('settings_modal.access_control_tab_checkbox_description')} // TODO
    >
      <StudioCheckboxTable hasError={hasError} errorMessage='todo'>
        <StudioCheckboxTable.Head
          title={t('settings_modal.access_control_tab_option_all_types')}
          getCheckboxProps={{
            ...getCheckboxProps({
              allowIndeterminate: true,
              value: 'all',
              onChange: savePartyTypesAllowed,
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
                  onChange: savePartyTypesAllowed,
                }),
              }}
            />
          ))}
        </StudioCheckboxTable.Body>
      </StudioCheckboxTable>
    </StudioFormGroup>
  );
}

function getUpdatedSelectedValues(
  oldSelectedValues: string[],
  valueClicked: string,
  checked: boolean,
): string[] {
  if (checked) {
    return [...oldSelectedValues, valueClicked];
  } else {
    return filterOutEmptyValues(oldSelectedValues, valueClicked);
  }
}

function filterOutEmptyValues(oldSelectedValues: string[], valueClicked: string): string[] {
  return oldSelectedValues.filter((value: string) => value !== valueClicked);
}

function mapSelectedValuesToPartyTypesAllowed(selectedValues: string[]): PartyTypesAllowed {
  return Object.fromEntries(
    Object.keys(partyTypesAllowedMap).map((key) => [
      key,
      selectedValues.includes(key as AllowedPartyTypes),
    ]),
  ) as PartyTypesAllowed;
}
