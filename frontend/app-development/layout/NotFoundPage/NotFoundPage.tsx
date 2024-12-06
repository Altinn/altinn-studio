import React from 'react';
import { StudioNotFoundPage } from '@studio/components';
import { Paragraph, Link } from '@digdir/designsystemet-react';
import { useTranslation, Trans } from 'react-i18next';

export const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <StudioNotFoundPage
      title={t('not_found_page.heading')}
      body={
        <Paragraph size='small'>
          <Trans
            i18nKey='not_found_page.text'
            components={{
              a: <Link href='/contact'> </Link>,
            }}
          ></Trans>
        </Paragraph>
      }
      redirectHref='/'
      redirectLinkText={t('not_found_page.redirect_to_dashboard')}
    />
  );
};
