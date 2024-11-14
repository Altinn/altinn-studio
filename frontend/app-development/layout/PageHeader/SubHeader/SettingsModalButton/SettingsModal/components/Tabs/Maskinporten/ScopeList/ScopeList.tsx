import React, { type ReactElement } from 'react';
import classes from './ScopeList.module.css';
import { StudioAlert, StudioSpinner } from '@studio/components';
import { useGetScopesQuery } from 'app-development/hooks/queries/useGetScopesQuery';
import { useTranslation } from 'react-i18next';

export const ScopeList = (): ReactElement => {
  const { t } = useTranslation();
  const { data: scopes, isPending: isPendingScopes } = useGetScopesQuery();

  if (isPendingScopes) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  if (scopes.length === 0) {
    return (
      <StudioAlert severity='info' className={classes.noScopeAlert}>
        {t('settings_modal.maskinporten_no_scopes_available')}
      </StudioAlert>
    );
  }

  return <div>List of scopes and possibility to select scope comes here</div>;
};
