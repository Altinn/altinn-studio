import React from 'react';
import { StudioNotFoundPage } from '@studio/components';
import { Paragraph, Link } from '@digdir/design-system-react';
import { useTranslation, Trans } from 'react-i18next';

export const NotFoundPage = () => {
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
