import React from 'react';
import type { ReactElement } from 'react';
import classes from './ScopeList.module.css';
import {
  StudioCheckboxTable,
  StudioFormGroup,
  StudioLink,
  StudioParagraph,
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

export type ScopeListProps = {
  maskinPortenScopes: MaskinportenScope[];
  selectedScopes: MaskinportenScope[];
};

export function ScopeList({ maskinPortenScopes, selectedScopes }: ScopeListProps): ReactElement {
  const { t } = useTranslation();

  const allOptions = maskinPortenScopes;
  const selectedOptions = selectedScopes;
  console.log('allOptions', allOptions);
  console.log('selectedOptions', selectedOptions);

  const initialValues: string[] = selectedOptions.map((scope: MaskinportenScope) => scope.scope); // TODO MOVE

  const title: string = t('app_settings.maskinporten_select_all_scopes');
  const minimimumRequiredCheckboxes = 0;

  const { getCheckboxProps, selectedValues, setSelectedValues } = useStudioCheckboxTable(
    initialValues,
    title,
    minimimumRequiredCheckboxes,
  );

  const contactByEmail = new GetInTouchWith(new EmailContactProvider());

  return (
    <div>
      <LoggedInTitle />
      <StudioParagraph className={classes.informationText}>
        {t('app_settings.maskinporten_tab_available_scopes_description')}
      </StudioParagraph>
      <StudioParagraph className={classes.informationText}>
        <Trans i18nKey='app_settings.maskinporten_tab_available_scopes_description_help'>
          <StudioLink href={contactByEmail.url('serviceOwner')} className={classes.link}>
            {' '}
          </StudioLink>
        </Trans>
      </StudioParagraph>
      <StudioCheckboxTable>
        <StudioCheckboxTable.Head
          title={title}
          getCheckboxProps={{
            ...getCheckboxProps({
              allowIndeterminate: true,
              value: 'all',
              // disabled - TODO
            }),
          }}
        />
        <StudioCheckboxTable.Body>
          {maskinPortenScopes.map((mappedOption: MaskinportenScope) => (
            <StudioCheckboxTable.Row
              key={mappedOption.scope}
              label={mappedOption.scope}
              // description={mappedOption.description}
              getCheckboxProps={{
                ...getCheckboxProps({
                  value: mappedOption.scope,
                }),
              }}
            />
          ))}
        </StudioCheckboxTable.Body>
      </StudioCheckboxTable>
    </div>
  );
}
