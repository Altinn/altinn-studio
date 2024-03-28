import React from 'react';
import { Table, Checkbox } from '@digdir/design-system-react';
import type { PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';
import classes from './SelectAllowedPartyTypes.module.css';

export interface SelectAllowedPartyTypesProps {
  t: (key: string) => string;
  appMetadata: any;
  isAllChecked: boolean;
  isSomeChecked: boolean;
  isNoneChecked: boolean;
  handleTableHeaderCheckboxChange: () => void;
  handleAllowedPartyTypeChange: (
    currentPartyTypesAllowed: PartyTypesAllowed,
    checkboxValue: string,
  ) => void;
  getPartyTypesAllowedOptions: () => any;
}

export const SelectAllowedPartyTypes = ({
  t,
  appMetadata,
  isAllChecked,
  isSomeChecked,
  isNoneChecked,
  handleTableHeaderCheckboxChange,
  handleAllowedPartyTypeChange,
  getPartyTypesAllowedOptions,
}: SelectAllowedPartyTypesProps) => {
  return (
    <Table className={classes.tableContent}>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell className={classes.header}>
            <Checkbox
              aria-label={t('settings_modal.access_control_tab_option_all_types')}
              checked={isAllChecked || isNoneChecked}
              indeterminate={!isAllChecked && isSomeChecked}
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
                  handleAllowedPartyTypeChange(appMetadata.partyTypesAllowed, mappedOption.value)
                }
                size='small'
                value={mappedOption.value}
                checked={appMetadata.partyTypesAllowed[mappedOption.value] || isNoneChecked}
              />
            </Table.Cell>
            <Table.Cell>{t(mappedOption.label)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};
