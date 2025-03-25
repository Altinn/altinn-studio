import React, { type ReactElement, useRef } from 'react';
import type { ApplicationMetadata, PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';
import classes from './SelectAllowedPartyTypes.module.css';
import { useTranslation } from 'react-i18next';
import { getPartyTypesAllowedOptions } from '../../../../utils/tabUtils/accessControlTabUtils';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { AccessControlWarningModal } from '../AccessControWarningModal';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioCheckboxTable } from '@studio/components-legacy';

export type SelectAllowedPartyTypesProps = {
  appMetadata: ApplicationMetadata;
};

export const SelectAllowedPartyTypes = ({
  appMetadata,
}: SelectAllowedPartyTypesProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const modalRef = useRef<HTMLDialogElement>(null);

  const partyTypesAllowed = appMetadata.partyTypesAllowed;
  const isNoCheckboxesChecked = Object.values(partyTypesAllowed).every((value) => !value);
  const areAllCheckboxesChecked = Object.values(partyTypesAllowed).every((value) => value);
  const isSomeCheckboxesChecked = Object.values(partyTypesAllowed).some((value) => value);

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const handleAllowedPartyTypeChange = (
    currentPartyTypesAllowed: PartyTypesAllowed,
    checkboxValue: string,
  ) => {
    const updatedPartyTypesAllowed = { ...currentPartyTypesAllowed };
    updatedPartyTypesAllowed[checkboxValue] = !currentPartyTypesAllowed[checkboxValue];

    const updatedCheckedCheckboxes = Object.values(updatedPartyTypesAllowed).filter(
      (value) => value,
    );

    if (updatedCheckedCheckboxes.length === 0) {
      modalRef.current?.showModal();
      return;
    }
    updateAppMetadataMutation({
      ...appMetadata,
      partyTypesAllowed: updatedPartyTypesAllowed,
    });
  };

  const handleTableHeaderCheckboxChange = () => {
    const updatedPartyTypesAllowed = appMetadata.partyTypesAllowed;
    Object.keys(appMetadata.partyTypesAllowed).forEach((key) => {
      updatedPartyTypesAllowed[key] = true;
    });
    updateAppMetadataMutation({
      ...appMetadata,
      partyTypesAllowed: updatedPartyTypesAllowed,
    });
  };

  return (
    <>
      <StudioCheckboxTable className={classes.tableContent}>
        <StudioCheckboxTable.Header
          title={t('settings_modal.access_control_tab_option_all_types')}
          checked={areAllCheckboxesChecked || isNoCheckboxesChecked}
          indeterminate={!areAllCheckboxesChecked && isSomeCheckboxesChecked}
          onChange={handleTableHeaderCheckboxChange}
        />
        <StudioCheckboxTable.Body>
          {getPartyTypesAllowedOptions().map((mappedOption) => (
            <StudioCheckboxTable.Row
              key={mappedOption.value}
              rowElement={{
                ...mappedOption,
                label: t(mappedOption.label),
                checked: partyTypesAllowed[mappedOption.value] || isNoCheckboxesChecked,
              }}
              onChange={() => handleAllowedPartyTypeChange(partyTypesAllowed, mappedOption.value)}
            />
          ))}
        </StudioCheckboxTable.Body>
      </StudioCheckboxTable>
      <AccessControlWarningModal modalRef={modalRef} />
    </>
  );
};
