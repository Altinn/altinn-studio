import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import classes from './ScopeList.module.css';
import {
  StudioAlert,
  StudioButton,
  StudioCheckboxTable,
  StudioDeleteButton,
  StudioDialog,
  StudioFormActions,
  StudioHeading,
  StudioLink,
  StudioParagraph,
  StudioSearch,
  StudioTable,
  useStudioCheckboxTable,
} from '@studio/components';
import { Trans, useTranslation } from 'react-i18next';
import { LoggedInTitle } from '../LoggedInTitle';
import { GetInTouchWith } from 'app-shared/getInTouch';
import { EmailContactProvider } from 'app-shared/getInTouch/providers';
import {
  type MaskinportenScopes,
  type MaskinportenScope,
} from 'app-shared/types/MaskinportenScope';
import { PlusIcon } from '@studio/icons';
import { useUpdateSelectedMaskinportenScopesMutation } from 'app-development/hooks/mutations/useUpdateSelectedMaskinportenScopesMutation';
import { toast } from 'react-toastify';
import {
  combineSelectedAndMaskinportenScopes,
  isMandatoryMaskinportenScope,
  mapMaskinPortenScopesToScopeList,
  mapSelectedValuesToMaskinportenScopes,
  sortScopesForDisplay,
} from './utils';

export type ScopeListProps = {
  maskinPortenScopes: MaskinportenScope[];
  selectedScopes: MaskinportenScope[];
};

export function ScopeList({ maskinPortenScopes, selectedScopes }: ScopeListProps): ReactElement {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [searchValue, setSearchValue] = useState<string>('');

  const allAvailableScopes: MaskinportenScope[] = useMemo(
    () => combineSelectedAndMaskinportenScopes(selectedScopes, maskinPortenScopes),
    [maskinPortenScopes, selectedScopes],
  );
  const sortedSelectedScopes: MaskinportenScope[] = useMemo(
    () => sortScopesForDisplay(selectedScopes),
    [selectedScopes],
  );
  const initialValues: string[] = useMemo(
    () => mapMaskinPortenScopesToScopeList(sortedSelectedScopes),
    [sortedSelectedScopes],
  );
  const contactByEmail = new GetInTouchWith(new EmailContactProvider());

  const openDialog = (): void => {
    setSearchValue('');
    dialogRef.current?.showModal();
  };

  return (
    <div>
      <LoggedInTitle />
      <StudioParagraph className={classes.informationText}>
        {t('app_settings.maskinporten_tab_available_scopes_description')}
      </StudioParagraph>
      <StudioParagraph className={classes.informationText}>
        <Trans i18nKey='app_settings.maskinporten_tab_available_scopes_description_help'>
          <StudioLink href={contactByEmail.url('serviceOwner')}> </StudioLink>
        </Trans>
      </StudioParagraph>
      <StudioAlert data-color='info' className={classes.deploymentNotice}>
        {t('app_settings.maskinporten_scope_changes_deployment_notice')}
      </StudioAlert>

      <StudioButton variant='secondary' onClick={openDialog} icon={<PlusIcon />}>
        {t('app_settings.maskinporten_add_scope')}
      </StudioButton>

      <SelectedScopesTable
        selectedScopes={sortedSelectedScopes}
        initialValues={initialValues}
        allAvailableScopes={allAvailableScopes}
      />
      <AddScopesDialog
        dialogRef={dialogRef}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        initialValues={initialValues}
        allAvailableScopes={allAvailableScopes}
      />
    </div>
  );
}

type SelectedScopesTableProps = {
  selectedScopes: MaskinportenScope[];
  initialValues: string[];
  allAvailableScopes: MaskinportenScope[];
};

function SelectedScopesTable({
  selectedScopes,
  initialValues,
  allAvailableScopes,
}: SelectedScopesTableProps): ReactElement {
  const { t } = useTranslation();
  const { saveScopes } = useSaveScopes(allAvailableScopes);

  const deleteScope = (scopeName: string): void => {
    if (isMandatoryMaskinportenScope(scopeName)) return;

    const updatedValues = initialValues.filter(
      (selectedValue: string) => selectedValue !== scopeName,
    );
    saveScopes(updatedValues);
  };

  if (selectedScopes.length === 0) {
    return (
      <StudioParagraph className={classes.emptyState}>
        {t('app_settings.maskinporten_no_scopes_added')}
      </StudioParagraph>
    );
  }

  return (
    <div className={classes.tableWrapper}>
      <StudioTable border={true}>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell>
              {t('app_settings.maskinporten_scope_name')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>{t('general.description')}</StudioTable.HeaderCell>
            <StudioTable.HeaderCell>{t('general.delete')}</StudioTable.HeaderCell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {selectedScopes.map((scope: MaskinportenScope) => {
            const isMandatoryScope = isMandatoryMaskinportenScope(scope.scope);

            return (
              <StudioTable.Row key={scope.scope}>
                <StudioTable.Cell>{scope.scope}</StudioTable.Cell>
                <StudioTable.Cell>{scope.description}</StudioTable.Cell>
                <StudioTable.Cell>
                  <StudioDeleteButton
                    variant='tertiary'
                    aria-label={t('general.delete_item', { item: scope.scope })}
                    disabled={isMandatoryScope}
                    onDelete={() => deleteScope(scope.scope)}
                  />
                </StudioTable.Cell>
              </StudioTable.Row>
            );
          })}
        </StudioTable.Body>
      </StudioTable>
    </div>
  );
}

type AddScopesDialogProps = {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  searchValue: string;
  setSearchValue: (value: string) => void;
  initialValues: string[];
  allAvailableScopes: MaskinportenScope[];
};

function AddScopesDialog({
  dialogRef,
  searchValue,
  setSearchValue,
  initialValues,
  allAvailableScopes,
}: AddScopesDialogProps): ReactElement {
  const { t } = useTranslation();
  const title: string = t('app_settings.maskinporten_select_all_scopes');
  const keepSelectionOnCloseRef = useRef<boolean>(false);
  const { saveScopes, isSaving } = useSaveScopes(allAvailableScopes);

  const { getCheckboxProps, selectedValues, setSelectedValues } = useStudioCheckboxTable(
    initialValues,
    title,
  );
  const selectedMandatoryScopeNames = useMemo(
    () => initialValues.filter(isMandatoryMaskinportenScope),
    [initialValues],
  );

  useEffect(() => {
    setSelectedValues(initialValues);
  }, [initialValues, setSelectedValues]);

  const filteredScopes = useMemo(() => {
    const searchTerm = searchValue.trim().toLowerCase();
    if (!searchTerm) return allAvailableScopes;

    return allAvailableScopes.filter(({ scope, description }: MaskinportenScope) => {
      return (
        scope.toLowerCase().includes(searchTerm) || description?.toLowerCase().includes(searchTerm)
      );
    });
  }, [allAvailableScopes, searchValue]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setSearchValue(event.target.value);
  };

  const handleDialogClose = (): void => {
    if (!keepSelectionOnCloseRef.current) {
      setSelectedValues(initialValues);
    }

    keepSelectionOnCloseRef.current = false;
    setSearchValue('');
  };

  const closeDialog = (): void => {
    dialogRef.current?.close();
  };

  const saveSelectedScopes = (): void => {
    const valuesToSave = Array.from(new Set([...selectedValues, ...selectedMandatoryScopeNames]));

    saveScopes(valuesToSave, () => {
      keepSelectionOnCloseRef.current = true;
      closeDialog();
    });
  };

  return (
    <StudioDialog
      ref={dialogRef}
      onClose={handleDialogClose}
      closedby='closerequest'
      className={classes.dialog}
    >
      <StudioDialog.Block className={classes.dialogBlock}>
        <div className={classes.dialogHeader}>
          <StudioHeading level={2} data-size='sm'>
            {t('app_settings.maskinporten_add_scope_dialog_title')}
          </StudioHeading>
          <StudioParagraph data-size='sm'>
            {t('app_settings.maskinporten_add_scope_dialog_description')}
          </StudioParagraph>
        </div>
        <StudioSearch
          data-size='sm'
          label={t('app_settings.maskinporten_scope_search_label')}
          value={searchValue}
          onChange={handleSearchChange}
          clearButtonLabel={t('general.search_clear_button_title')}
        />
        <div className={classes.dialogTableWrapper}>
          <StudioCheckboxTable data-size='sm'>
            <StudioCheckboxTable.Head
              title={title}
              descriptionCellTitle={t('app_settings.maskinporten_select_all_scopes_description')}
              getCheckboxProps={{
                ...getCheckboxProps({
                  allowIndeterminate: true,
                  value: 'all',
                }),
              }}
            />
            <StudioCheckboxTable.Body>
              {filteredScopes.map((scope: MaskinportenScope) => {
                const isSelectedMandatoryScope = selectedMandatoryScopeNames.includes(scope.scope);

                return (
                  <StudioCheckboxTable.Row
                    key={scope.scope}
                    label={scope.scope}
                    description={scope.description}
                    getCheckboxProps={{
                      ...getCheckboxProps({
                        value: scope.scope,
                      }),
                      disabled: isSelectedMandatoryScope,
                    }}
                  />
                );
              })}
            </StudioCheckboxTable.Body>
          </StudioCheckboxTable>
          {filteredScopes.length === 0 && (
            <StudioParagraph className={classes.emptyState}>
              {t('app_settings.maskinporten_no_scopes_search_match')}
            </StudioParagraph>
          )}
        </div>
        <StudioFormActions
          primary={{
            label: t('app_settings.maskinporten_add_scope_dialog_done'),
            onClick: saveSelectedScopes,
          }}
          secondary={{ label: t('general.cancel'), onClick: closeDialog }}
          isLoading={isSaving}
          className={classes.actionsWrapper}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
}

type UseSaveScopesResult = {
  saveScopes: (selectedValues: string[], onSuccess?: () => void) => void;
  isSaving: boolean;
};

function useSaveScopes(allAvailableScopes: MaskinportenScope[]): UseSaveScopesResult {
  const { t } = useTranslation();
  const { mutate: mutateSelectedMaskinportenScopes, isPending: isSaving } =
    useUpdateSelectedMaskinportenScopesMutation();

  const saveScopes = (selectedValues: string[], onSuccess?: () => void): void => {
    const updatedScopeList: MaskinportenScope[] = mapSelectedValuesToMaskinportenScopes(
      selectedValues,
      allAvailableScopes,
    );
    const updatedScopes: MaskinportenScopes = { scopes: updatedScopeList };

    mutateSelectedMaskinportenScopes(updatedScopes, {
      onSuccess: () => {
        toast.success(t('app_settings.maskinporten_tab_save_scopes_success_message'));
        onSuccess?.();
      },
      onError: () => {
        toast.error(t('app_settings.maskinporten_tab_save_scopes_error_message'));
      },
    });
  };

  return { saveScopes, isSaving };
}
