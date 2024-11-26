import React, { type ChangeEvent, useState, type ReactElement } from 'react';
import classes from './ScopeList.module.css';

import {
  StudioCheckboxTable,
  type StudioCheckboxTableRowElement,
  StudioLink,
  StudioParagraph,
} from '@studio/components';
import { Trans, useTranslation } from 'react-i18next';
import { type MaskinportenScope } from 'app-shared/types/MaskinportenScope';
import {
  getAllElementsChecked,
  getAllElementsDisabled,
  getSomeElementsChecked,
  mapRowElementsToSelectedScopes,
  mapScopesToRowElements,
  toggleRowElementCheckedState,
  updateRowElementsCheckedState,
} from './utils';
import { GetInTouchWith } from 'app-shared/getInTouch';
import { EmailContactProvider } from 'app-shared/getInTouch/providers';
import { LoggedInTitle } from '../LoggedInTitle';

export type ScopeListProps = {
  maskinPortenScopes: MaskinportenScope[];
  selectedScopes: MaskinportenScope[];
};

export const ScopeList = ({ maskinPortenScopes, selectedScopes }: ScopeListProps): ReactElement => {
  const { t } = useTranslation();

  const checkboxTableRowElements: StudioCheckboxTableRowElement[] = mapScopesToRowElements(
    maskinPortenScopes,
    selectedScopes,
  );

  const contactByEmail = new GetInTouchWith(new EmailContactProvider());

  // This useState is temporary to simulate correct behaviour in browser. It will be removed and replaced by a mutation function
  const [rowElements, setRowElements] =
    useState<StudioCheckboxTableRowElement[]>(checkboxTableRowElements);

  const areAllChecked = getAllElementsChecked(rowElements);
  const isAnyChecked = getSomeElementsChecked(rowElements);
  const allScopesDisabled: boolean = getAllElementsDisabled(rowElements);

  const handleChangeAllScopes = () => {
    const updatedRowElements: StudioCheckboxTableRowElement[] = updateRowElementsCheckedState(
      rowElements,
      areAllChecked,
    );
    saveUpdatedScopes(updatedRowElements);
  };

  const handleChangeScope = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedScope = event.target.value;
    const updatedRowElements: StudioCheckboxTableRowElement[] = toggleRowElementCheckedState(
      rowElements,
      selectedScope,
    );
    saveUpdatedScopes(updatedRowElements);
  };

  const saveUpdatedScopes = (updatedRowElements: StudioCheckboxTableRowElement[]) => {
    const updatedScopes: MaskinportenScope[] = mapRowElementsToSelectedScopes(updatedRowElements);
    console.log('SelectedScopes', updatedScopes);

    // TODO: Replace line below with mutation call to update the database
    setRowElements(updatedRowElements);
  };

  return (
    <div>
      <LoggedInTitle />
      <StudioParagraph size='sm' spacing className={classes.informationText}>
        {t('settings_modal.maskinporten_tab_available_scopes_description')}
      </StudioParagraph>
      <StudioParagraph size='sm' spacing className={classes.informationText}>
        <Trans i18nKey='settings_modal.maskinporten_tab_available_scopes_description_help'>
          <StudioLink href={contactByEmail.url('serviceOwner')} className={classes.link}>
            {' '}
          </StudioLink>
        </Trans>
      </StudioParagraph>
      <StudioCheckboxTable className={classes.table}>
        <StudioCheckboxTable.Header
          title={t('settings_modal.maskinporten_select_all_scopes')}
          checked={areAllChecked}
          indeterminate={isAnyChecked && !areAllChecked}
          onChange={handleChangeAllScopes}
          disabled={allScopesDisabled}
        />
        <StudioCheckboxTable.Body>
          {
            // Replace "rowElements" with "checkboxTableRowElements" when ready to implement with mutation function
            rowElements.map((rowElement: StudioCheckboxTableRowElement) => (
              <ScopeListItem
                key={rowElement.value}
                rowElement={rowElement}
                onChangeScope={handleChangeScope}
              />
            ))
          }
        </StudioCheckboxTable.Body>
      </StudioCheckboxTable>
    </div>
  );
};

type ScopeListItemProps = {
  rowElement: StudioCheckboxTableRowElement;
  onChangeScope: (event: ChangeEvent<HTMLInputElement>) => void;
};

const ScopeListItem = ({ rowElement, onChangeScope }: ScopeListItemProps): ReactElement => {
  return (
    <StudioCheckboxTable.Row
      key={rowElement.value}
      rowElement={rowElement}
      onChange={onChangeScope}
    />
  );
};
