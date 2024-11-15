import React, { type ReactElement } from 'react';
import classes from './ScopeList.module.css';
import { StudioAlert, StudioCheckbox, StudioSpinner } from '@studio/components';
import { useGetScopesQuery } from 'app-development/hooks/queries/useGetScopesQuery';
import { useTranslation } from 'react-i18next';
import { type MaskinportenScope } from 'app-shared/types/MaskinportenScope';
import { useGetSelectedScopesQuery } from 'app-development/hooks/queries/useGetSelectedScopesQuery';

export const ScopeList = (): ReactElement => {
  const { t } = useTranslation();
  const { data: scopes, isPending: isPendingScopes } = useGetScopesQuery();
  const { data: selectedScopes, isPending: isPendingSelectedScopes } = useGetSelectedScopesQuery();

  const hasScopes: boolean = scopes?.length > 0;
  const isPendingQueries: boolean = isPendingScopes || isPendingSelectedScopes;

  const handleChangeScope = (values: string[]) => {
    const updatedScopes: MaskinportenScope[] = mapLabelStringsToScopes(values, scopes);
    console.log('The list of updated scopes are: ', updatedScopes);

    // TODO: Mutation call to update the database
  };

  if (isPendingQueries) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  if (hasScopes) {
    return (
      <div>
        <StudioCheckbox.Group
          legend='Dine tilgjengelige scopes'
          value={mapScopesToLabelStrings(selectedScopes)}
          description='Dette er en liste med scopene du har tilgjengelig fra Maskinporten.'
          size='sm'
          onChange={handleChangeScope}
        >
          {scopes.map((scope: MaskinportenScope) => (
            <StudioCheckbox
              size='sm'
              value={scope.label}
              description={scope.description}
              key={scope.label}
            >
              {scope.label}
            </StudioCheckbox>
          ))}
        </StudioCheckbox.Group>
      </div>
    );
  }

  return (
    <StudioAlert severity='info' className={classes.noScopeAlert}>
      {t('settings_modal.maskinporten_no_scopes_available')}
    </StudioAlert>
  );
};

const mapScopesToLabelStrings = (scopes: MaskinportenScope[]): string[] => {
  return scopes.map((scope: MaskinportenScope) => scope.label);
};

const mapLabelStringsToScopes = (
  labelStrings: string[],
  availableScopes: MaskinportenScope[],
): MaskinportenScope[] => {
  return labelStrings.map((label) => availableScopes.find((scope) => scope.label === label));
};
