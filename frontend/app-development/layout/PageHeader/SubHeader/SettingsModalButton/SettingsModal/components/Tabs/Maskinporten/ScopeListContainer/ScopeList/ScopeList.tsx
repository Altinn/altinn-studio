import React, { type ChangeEvent, type ReactElement } from 'react';
import classes from './ScopeList.module.css';
import {
  StudioCheckboxTable,
  type StudioCheckboxTableRowElement,
  StudioLink,
  StudioParagraph,
} from '@studio/components-legacy';
import { Trans, useTranslation } from 'react-i18next';
import {
  type MaskinportenScopes,
  type MaskinportenScope,
} from 'app-shared/types/MaskinportenScope';
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
import { useUpdateSelectedMaskinportenScopesMutation } from 'app-development/hooks/mutations/useUpdateSelectedMaskinportenScopesMutation';
import { SaveStatus } from '../SaveStatus';

export type ScopeListProps = {
  maskinPortenScopes: MaskinportenScope[];
  selectedScopes: MaskinportenScope[];
};

export const ScopeList = ({ maskinPortenScopes, selectedScopes }: ScopeListProps): ReactElement => {
  const { t } = useTranslation();
  const {
    mutate: mutateSelectedMaskinportenScopes,
    isPending: isPendingSaveScopes,
    isSuccess: scopesSaved,
  } = useUpdateSelectedMaskinportenScopesMutation();

  const checkboxTableRowElements: StudioCheckboxTableRowElement[] = mapScopesToRowElements(
    maskinPortenScopes,
    selectedScopes,
  );

  const contactByEmail = new GetInTouchWith(new EmailContactProvider());

  const areAllChecked = getAllElementsChecked(checkboxTableRowElements);
  const isAnyChecked = getSomeElementsChecked(checkboxTableRowElements);
  const allScopesDisabled: boolean = getAllElementsDisabled(checkboxTableRowElements);

  const handleChangeAllScopes = () => {
    const updatedRowElements: StudioCheckboxTableRowElement[] = updateRowElementsCheckedState(
      checkboxTableRowElements,
      areAllChecked,
    );
    saveUpdatedScopes(updatedRowElements);
  };

  const handleChangeScope = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedScope = event.target.value;
    const updatedRowElements: StudioCheckboxTableRowElement[] = toggleRowElementCheckedState(
      checkboxTableRowElements,
      selectedScope,
    );
    saveUpdatedScopes(updatedRowElements);
  };

  const saveUpdatedScopes = (updatedRowElements: StudioCheckboxTableRowElement[]) => {
    const updatedScopeList: MaskinportenScope[] =
      mapRowElementsToSelectedScopes(updatedRowElements);
    const updatedScopes: MaskinportenScopes = { scopes: updatedScopeList };

    mutateSelectedMaskinportenScopes(updatedScopes);
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
          {checkboxTableRowElements.map((rowElement: StudioCheckboxTableRowElement) => (
            <ScopeListItem
              key={rowElement.value}
              rowElement={rowElement}
              onChangeScope={handleChangeScope}
            />
          ))}
        </StudioCheckboxTable.Body>
      </StudioCheckboxTable>
      <SaveStatus isPending={isPendingSaveScopes} isSaved={scopesSaved} />
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
