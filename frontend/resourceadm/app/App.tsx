import React from 'react';
import classes from './App.module.css';
import './App.css';
import { PageSpinner } from 'app-shared/components';

import { PageLayout } from 'resourceadm/pages/PageLayout';
import { ResourceDashboard } from '../pages/ResourceDashboard';
import { RessurstilgangSide1 } from '../pages/RessurstilgangSide1';
import { OlsenbandenPage } from '../pages/OlsenbandenPage';
import { TestPage } from '../pages/TestPage';

import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useUserQuery } from '../hooks/useUserQueries';
import { useOrganizationsQuery } from 'resourceadm/hooks/useOrganizationQueries';

import { ErrorMessage } from 'resourceadm/components/ErrorMessage';


export const App = (): JSX.Element => {

  // console.log("Er i App. Skal ha user og organizations");
  
  // 15.05.23: Ettersom dette er RESSURS-App så skal repo være definert om
  // bruker og organisasjon er definert... men vi har bare en ARRAY av org så langt...
  // ---> diskuterte med Rune: han sier dette er avhengig av knapp/link fra Dashboard
  // men at han ville foretrukket at organisasjon blir tatt med fra Dashboard
  // Rune sa også at det ikke finnes en BACKEND getCurrentOrg
  // slik det er for getCurrentUser ---> noe med Gitea her også

  const { t } = useTranslation();

  const { data: user, isError: isUserError } = useUserQuery();
  const { data: organizations, isError: isOrganizationsError } = useOrganizationsQuery();


  const componentIsReady = user && organizations;
  const componentHasError = isUserError || isOrganizationsError;



  const getErrorMessage = (): { title: string; message: string } => {
    const defaultTitle = 'Feil oppstod ved innlasting av';
    const defaultMessage = 'Vi beklager men en feil oppstod ved henting av';
    if (isUserError) {
      return {
        title: `${defaultTitle} brukerdata`,
        message: `${defaultMessage} dine brukerdata.`,
      };
    }
    if (isOrganizationsError) {
      return {
        title: `${defaultTitle} organisasjoner`,
        message: `${defaultMessage} organisasjoner som kreves for å kjøre applikasjonen.`,
      };
    }
    return {
      title: 'Ukjent feil oppstod',
      message: 'Vi beklager men en ukjent feil, vennligst prøv igjen senere.',
    };
  };

  if (componentHasError) {
    const error = getErrorMessage();
    return <ErrorMessage title={error.title} message={error.message} />;
  }


  // 14.05.23: selve <Dashboard /> komponenten er en spagettiklump
  // av starredRepos sammenfiltringer. Nesten umulig å gjenbruke.
  // Muligens kan vi begynne med komponenten <RepoList /> og
  // <OrgRepoList /> og så bygge opp fra bunn.

  if (componentIsReady) {
    return (
      <div className={classes.root}>
        <Routes>

          <Route element={<PageLayout />}>
            <Route path='/'  element={ <ResourceDashboard user = {user} organizations={organizations} /> } />
          </Route>

          <Route element={ <TestPage /> } >
            <Route path='/skatt/repo1' element={ <ResourceDashboard user = {user} organizations={organizations} /> } />
          </Route>

          <Route path='/skatt/repo2' element={ <TestPage /> } />

          <Route path='/skatt/repo3' element={<PageLayout />}/>

          <Route path='/skatt/dummy1' element={ <RessurstilgangSide1 /> } />

          <Route path='/olsenbanden' element={ <OlsenbandenPage /> } />

        </Routes>
      </div>
    );
  }

  return <PageSpinner text={t('dashboard.loading')} />;
};
