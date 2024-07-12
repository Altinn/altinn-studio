import React from 'react';
import { StudioNotFoundPage } from '@studio/components';
import { Paragraph, Link } from '@digdir/designsystemet-react';
import { useTranslation, Trans } from 'react-i18next';
import { Contact } from 'app-shared/userFeedback';
import { EmailContactProvider } from 'app-shared/userFeedback/providers';

export const NotFoundPage = () => {
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
