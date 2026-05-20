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
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import {
  addDefaultMaskinportenScopes,
  defaultMaskinportenScopeNames,
  shouldShowDefaultMaskinportenScopesOptIn,
} from 'app-development/utils/maskinportenScopes';
import {
  combineSelectedAndMaskinportenScopes,
  isDefaultMaskinportenScope,
  mapMaskinPortenScopesToScopeList,
  mapSelectedValuesToMaskinportenScopes,
  sortScopesForDisplay,
} from './utils';

export type ScopeListProps = {
  maskinPortenScopes: MaskinportenScope[];
  selectedScopes: MaskinportenScope[];
  canManageScopes?: boolean;
};

export function ScopeList({
  maskinPortenScopes,
  selectedScopes,
  canManageScopes = true,
}: ScopeListProps): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: appVersion } = useAppVersionQuery(org, app);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [searchValue, setSearchValue] = useState<string>('');
  const shouldShowDefaultScopesOptIn: boolean = shouldShowDefaultMaskinportenScopesOptIn(
    appVersion?.backendVersion,
    selectedScopes,
  );

  const allAvailableScopes: MaskinportenScope[] = useMemo(() => {
    const combinedScopes = combineSelectedAndMaskinportenScopes(selectedScopes, maskinPortenScopes);
    const scopes = shouldShowDefaultScopesOptIn
      ? addDefaultMaskinportenScopes(combinedScopes)
      : combinedScopes;

    return sortScopesForDisplay(scopes);
  }, [maskinPortenScopes, selectedScopes, shouldShowDefaultScopesOptIn]);
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
      {canManageScopes && (
        <>
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
          <DefaultScopesNotice
            shouldShowDefaultScopesOptIn={shouldShowDefaultScopesOptIn}
            initialValues={initialValues}
            allAvailableScopes={allAvailableScopes}
          />

          <StudioButton variant='secondary' onClick={openDialog} icon={<PlusIcon />}>
            {t('app_settings.maskinporten_add_scope')}
          </StudioButton>
        </>
      )}

      <SelectedScopesTable
        selectedScopes={sortedSelectedScopes}
        initialValues={initialValues}
        allAvailableScopes={allAvailableScopes}
        canManageScopes={canManageScopes}
      />
      {canManageScopes && (
        <AddScopesDialog
          dialogRef={dialogRef}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          initialValues={initialValues}
          allAvailableScopes={allAvailableScopes}
        />
      )}
    </div>
  );
}

type DefaultScopesNoticeProps = {
  shouldShowDefaultScopesOptIn: boolean;
  initialValues: string[];
  allAvailableScopes: MaskinportenScope[];
};

function DefaultScopesNotice({
  shouldShowDefaultScopesOptIn,
  initialValues,
  allAvailableScopes,
}: DefaultScopesNoticeProps): ReactElement | null {
  const { t } = useTranslation();
  const { saveScopes, isSaving } = useSaveScopes(allAvailableScopes);

  if (!shouldShowDefaultScopesOptIn) return null;

  const addDefaultScopes = (): void => {
    saveScopes(Array.from(new Set([...initialValues, ...defaultMaskinportenScopeNames])));
  };

  return (
    <StudioAlert data-color='info' className={classes.defaultScopesNotice}>
      <StudioParagraph>
        {t('app_settings.maskinporten_default_scopes_opt_in_notice')}
      </StudioParagraph>
      <StudioButton variant='secondary' onClick={addDefaultScopes} loading={isSaving}>
        {t('app_settings.maskinporten_add_default_scopes')}
      </StudioButton>
    </StudioAlert>
  );
}

type SelectedScopesTableProps = {
  selectedScopes: MaskinportenScope[];
  initialValues: string[];
  allAvailableScopes: MaskinportenScope[];
  canManageScopes: boolean;
};

function SelectedScopesTable({
  selectedScopes,
  initialValues,
  allAvailableScopes,
  canManageScopes,
}: SelectedScopesTableProps): ReactElement {
  const { t } = useTranslation();
  const { saveScopes } = useSaveScopes(allAvailableScopes);

  const deleteScope = (scopeName: string): void => {
    if (isDefaultMaskinportenScope(scopeName)) return;

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
            {canManageScopes && (
              <StudioTable.HeaderCell>{t('general.delete')}</StudioTable.HeaderCell>
            )}
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {selectedScopes.map((scope: MaskinportenScope) => {
            const isDefaultScope = isDefaultMaskinportenScope(scope.scope);

            return (
              <StudioTable.Row key={scope.scope}>
                <StudioTable.Cell>{scope.scope}</StudioTable.Cell>
                <StudioTable.Cell>{scope.description}</StudioTable.Cell>
                {canManageScopes && (
                  <StudioTable.Cell>
                    <StudioDeleteButton
                      variant='tertiary'
                      aria-label={t('general.delete_item', { item: scope.scope })}
                      disabled={isDefaultScope}
                      onDelete={() => deleteScope(scope.scope)}
                    />
                  </StudioTable.Cell>
                )}
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
  const selectedDefaultScopeNames = useMemo(
    () => initialValues.filter(isDefaultMaskinportenScope),
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
    const valuesToSave = Array.from(new Set([...selectedValues, ...selectedDefaultScopeNames]));

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
                const isSelectedDefaultScope = selectedDefaultScopeNames.includes(scope.scope);

                return (
                  <StudioCheckboxTable.Row
                    key={scope.scope}
                    label={scope.scope}
                    description={scope.description}
                    getCheckboxProps={{
                      ...getCheckboxProps({
                        value: scope.scope,
                      }),
                      disabled: isSelectedDefaultScope,
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
