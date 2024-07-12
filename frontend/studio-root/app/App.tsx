import React from 'react';
import classes from './App.module.css';
import { Route, Routes } from 'react-router-dom';
import { StudioNotFoundPage } from '@studio/components';
import { Paragraph, Link } from '@digdir/designsystemet-react';
import { useTranslation, Trans } from 'react-i18next';

import './App.css';
import { PageLayout } from '../pages/PageLayout';
import { ContactPage } from '../pages/Contact/ContactPage';
import { EmailContactProvider } from 'app-shared/userFeedback/providers';
import { Contact } from 'app-shared/userFeedback';

export const App = (): JSX.Element => {
  return (
    <div className={classes.root}>
      <Routes>
        <Route element={<PageLayout />}>
          <Route path='/contact' element={<ContactPage />} />
          <Route path='*' element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  );
};

const NotFoundPage = () => {
  const { t } = useTranslation();

  const contactByEmail = new Contact(new EmailContactProvider());

  return (
    <StudioNotFoundPage
      title={t('not_found_page.heading')}
      body={
        <Paragraph size='small'>
          <Trans i18nKey='not_found_page.text'>
            <Link href={contactByEmail.url('serviceOwner')}>tjenesteeier@altinn.no</Link>
          </Trans>
        </Paragraph>
      }
      redirectHref='/'
      redirectLinkText={t('not_found_page.redirect_to_dashboard')}
    />
  );
};
