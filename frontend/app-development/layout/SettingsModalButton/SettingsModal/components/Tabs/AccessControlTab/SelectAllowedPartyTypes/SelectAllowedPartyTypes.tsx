import React, { useRef } from 'react';
import { Table, Checkbox } from '@digdir/design-system-react';
import type { PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';
import classes from './SelectAllowedPartyTypes.module.css';
import { useTranslation } from 'react-i18next';
import { getPartyTypesAllowedOptions } from '../../../../utils/tabUtils/accessControlTabUtils';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { AccessControlWarningModal } from '../AccessControWarningModal';

export interface SelectAllowedPartyTypesProps {
  org: string;
  app: string;
  partyTypesAllowed: PartyTypesAllowed;
}

export const SelectAllowedPartyTypes = ({
  partyTypesAllowed,
  org,
  app,
}: SelectAllowedPartyTypesProps) => {
  const { t } = useTranslation();
  const isNoCheckboxesChecked = Object.values(partyTypesAllowed).every((value) => !value);
  const areAllCheckboxesChecked = Object.values(partyTypesAllowed).every((value) => value);
  const isSomeCheckboxesChecked = Object.values(partyTypesAllowed).some((value) => value);
  const modalRef = useRef<HTMLDialogElement>(null);

  const { data: appMetadata } = useAppMetadataQuery(org, app);

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
      console.log(modalRef.current);

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
      <Table className={classes.tableContent}>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell className={classes.header}>
              <Checkbox
                aria-label={t('settings_modal.access_control_tab_option_all_types')}
                checked={areAllCheckboxesChecked || isNoCheckboxesChecked}
                indeterminate={!areAllCheckboxesChecked && isSomeCheckboxesChecked}
                onChange={handleTableHeaderCheckboxChange}
                aria-checked
                size='small'
                value='all'
              />
            </Table.HeaderCell>
            <Table.HeaderCell className={classes.header} aria-hidden>
              {t('settings_modal.access_control_tab_option_all_types')}
            </Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {getPartyTypesAllowedOptions().map((mappedOption, key) => (
            <Table.Row key={mappedOption.value}>
              <Table.Cell className={classes.checkboxContent}>
                <Checkbox
                  aria-label={t(mappedOption.label)}
                  key={key}
                  onChange={() =>
                    handleAllowedPartyTypeChange(partyTypesAllowed, mappedOption.value)
                  }
                  size='small'
                  value={mappedOption.value}
                  checked={partyTypesAllowed[mappedOption.value] || isNoCheckboxesChecked}
                />
              </Table.Cell>
              <Table.Cell>{t(mappedOption.label)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <AccessControlWarningModal modalRef={modalRef} />
    </>
  );
};
