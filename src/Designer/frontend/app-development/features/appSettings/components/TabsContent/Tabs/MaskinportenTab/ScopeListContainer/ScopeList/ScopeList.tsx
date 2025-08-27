import React from 'react';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import classes from './ScopeList.module.css';
import {
  StudioButton,
  StudioCheckboxTable,
  StudioLink,
  StudioParagraph,
  useStudioCheckboxTable,
} from 'libs/studio-components/src';
import { Trans, useTranslation } from 'react-i18next';
import { LoggedInTitle } from '../LoggedInTitle';
import { GetInTouchWith } from 'app-shared/getInTouch';
import { EmailContactProvider } from 'app-shared/getInTouch/providers';
import {
  type MaskinportenScopes,
  type MaskinportenScope,
} from 'app-shared/types/MaskinportenScope';
import { CheckmarkIcon, XMarkIcon } from 'libs/studio-icons/src';
import { useUpdateSelectedMaskinportenScopesMutation } from '../../../../../../../../hooks/mutations/useUpdateSelectedMaskinportenScopesMutation';
import { toast } from 'react-toastify';
import { ArrayUtils } from 'libs/studio-pure-functions/src';
import {
  combineSelectedAndMaskinportenScopes,
  mapMaskinPortenScopesToScopeList,
  mapSelectedValuesToMaskinportenScopes,
} from './utils';

export type ScopeListProps = {
  maskinPortenScopes: MaskinportenScope[];
  selectedScopes: MaskinportenScope[];
};

export function ScopeList({ maskinPortenScopes, selectedScopes }: ScopeListProps): ReactElement {
  const { t } = useTranslation();

  const allAvailableScopes: MaskinportenScope[] = combineSelectedAndMaskinportenScopes(
    selectedScopes,
    maskinPortenScopes,
  );
  const initialValues: string[] = mapMaskinPortenScopesToScopeList(selectedScopes);
  const title: string = t('app_settings.maskinporten_select_all_scopes');
  const contactByEmail = new GetInTouchWith(new EmailContactProvider());

  const { getCheckboxProps, selectedValues, setSelectedValues } = useStudioCheckboxTable(
    initialValues,
    title,
  );

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
      <StudioCheckboxTable>
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
          {allAvailableScopes.map((mappedOption: MaskinportenScope) => (
            <StudioCheckboxTable.Row
              key={mappedOption.scope}
              label={mappedOption.scope}
              description={mappedOption.description}
              getCheckboxProps={{
                ...getCheckboxProps({
                  value: mappedOption.scope,
                }),
              }}
            />
          ))}
        </StudioCheckboxTable.Body>
      </StudioCheckboxTable>
      <ActionButtons
        selectedValues={selectedValues}
        setSelectedValues={setSelectedValues}
        initialValues={initialValues}
        allAvailableScopes={allAvailableScopes}
      />
    </div>
  );
}

type ActionButtonsProps = {
  selectedValues: string[];
  setSelectedValues: Dispatch<SetStateAction<string[]>>;
  initialValues: string[];
  allAvailableScopes: MaskinportenScope[];
};

function ActionButtons({
  selectedValues,
  setSelectedValues,
  initialValues,
  allAvailableScopes,
}: ActionButtonsProps): ReactElement {
  const { t } = useTranslation();

  const isNewValuesSameAsInitialValues: boolean = ArrayUtils.arraysEqualUnordered(
    initialValues,
    selectedValues,
  );

  const disableButtons: boolean = isNewValuesSameAsInitialValues;

  const { mutate: mutateSelectedMaskinportenScopes } =
    useUpdateSelectedMaskinportenScopesMutation();

  const saveScopes = () => {
    const updatedScopeList: MaskinportenScope[] = mapSelectedValuesToMaskinportenScopes(
      selectedValues,
      allAvailableScopes,
    );
    const updatedScopes: MaskinportenScopes = { scopes: updatedScopeList };

    mutateSelectedMaskinportenScopes(updatedScopes, {
      onSuccess: () => {
        toast.success(t('app_settings.maskinporten_tab_save_scopes_success_message'));
      },
      onError: () => {
        toast.error(t('app_settings.maskinporten_tab_save_scopes_error_message'));
      },
    });
  };

  const reset = () => {
    setSelectedValues(initialValues);
  };

  return (
    <div className={classes.buttonContainer}>
      <StudioButton onClick={saveScopes} disabled={disableButtons} icon={<CheckmarkIcon />}>
        {t('app_settings.maskinporten_tab_save_scopes')}
      </StudioButton>
      <StudioButton
        variant='secondary'
        disabled={disableButtons}
        onClick={reset}
        icon={<XMarkIcon />}
      >
        {t('app_settings.maskinporten_tab_reset_scopes')}
      </StudioButton>
    </div>
  );
}
