import React from 'react';
import classes from './App.module.css';
import { Route, Routes } from 'react-router-dom';
import { StudioNotFoundPage } from '@studio/components';
import { Paragraph, Link } from '@digdir/design-system-react';
import { useTranslation, Trans } from 'react-i18next';

import './App.css';
import { PageLayout } from '../pages/PageLayout';
import { Contact } from '../pages/Contact/Contact';

export const App = (): JSX.Element => {
  return (
    <div className={classes.root}>
      <Routes>
        <Route element={<PageLayout />}>
          <Route path='/contact' element={<Contact />} />
          <Route path='*' element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  );
};

const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <StudioNotFoundPage
      title={t('not_found_page.heading')}
      body={
        <Paragraph size='small'>
          <Trans i18nKey='not_found_page.text'>
            <Link href='mailto:tjenesteeier@altinn.no'>tjenesteeier@altinn.no</Link>
          </Trans>
        </Paragraph>
      }
      redirectHref='/'
      redirectLinkText={t('not_found_page.redirect_to_dashboard')}
    />
  );
};
