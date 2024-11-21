import React, { useState, type ChangeEvent, type ReactElement } from 'react';
import classes from './ScopeList.module.css';
import {
  StudioAlert,
  StudioCheckboxTable,
  type StudioCheckboxTableRowElement,
  StudioHeading,
  StudioParagraph,
  StudioSpinner,
} from '@studio/components';
import { useGetScopesQuery } from 'app-development/hooks/queries/useGetScopesQuery';
import { useTranslation } from 'react-i18next';
import { type MaskinportenScope } from 'app-shared/types/MaskinportenScope';
import { useGetSelectedScopesQuery } from 'app-development/hooks/queries/useGetSelectedScopesQuery';
import {
  mapRowElementsToSelectedScopes,
  mapScopesToRowElements,
  toggleRowElementCheckedState,
  updateRowElementsCheckedState,
} from './utils';

export const ScopeList = (): ReactElement => {
  const { t } = useTranslation();
  const { data: maskinPortenScopes, isPending: isPendingMaskinportenScopes } = useGetScopesQuery();
  const { data: selectedScopes, isPending: isPendingSelectedScopes } = useGetSelectedScopesQuery();

  const hasScopes: boolean = maskinPortenScopes?.length > 0;
  const isPendingScopeQueries: boolean = isPendingMaskinportenScopes || isPendingSelectedScopes;

  if (isPendingScopeQueries) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  if (hasScopes) {
    return (
      <ScopeListContent maskinPortenScopes={maskinPortenScopes} selectedScopes={selectedScopes} />
    );
  }

  return (
    <StudioAlert severity='info' className={classes.noScopeAlert}>
      {t('settings_modal.maskinporten_no_scopes_available')}
    </StudioAlert>
  );
};

type ScopeListContentProps = {
  maskinPortenScopes: MaskinportenScope[];
  selectedScopes: MaskinportenScope[];
};

const ScopeListContent = ({
  maskinPortenScopes,
  selectedScopes,
}: ScopeListContentProps): ReactElement => {
  const { t } = useTranslation();

  const checkboxTableRowElements: StudioCheckboxTableRowElement[] = mapScopesToRowElements(
    maskinPortenScopes,
    selectedScopes,
  );

  // This useState is temporary to simulate correct behaviour in browser. It will be removed and replaced by a mutation function
  const [rowElements, setRowElements] =
    useState<StudioCheckboxTableRowElement[]>(checkboxTableRowElements);

  const areAllChecked = rowElements.every((element) => element.checked || element.disabled);
  const isAnyChecked = rowElements.some((element) => element.checked);

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
    <>
      <StudioHeading size='2xs' level={2} spacing>
        {t('settings_modal.maskinporten_tab_available_scopes_title')}
      </StudioHeading>
      <StudioParagraph size='sm' spacing>
        {t('settings_modal.maskinporten_tab_available_scopes_description')}
      </StudioParagraph>
      <StudioCheckboxTable className={classes.table}>
        <StudioCheckboxTable.Header
          title={t('settings_modal.maskinporten_select_all_scopes')}
          checked={areAllChecked}
          indeterminate={isAnyChecked && !areAllChecked}
          onChange={handleChangeAllScopes}
        />
        <StudioCheckboxTable.Body>
          {
            // Replace "rowElements" with "checkboxTableRowElements" when ready to implement with mutation function
            rowElements.map((rowElement: StudioCheckboxTableRowElement) => (
              <StudioCheckboxTable.Row
                key={rowElement.value}
                rowElement={rowElement}
                onChange={handleChangeScope}
              />
            ))
          }
        </StudioCheckboxTable.Body>
      </StudioCheckboxTable>
    </>
  );
};
