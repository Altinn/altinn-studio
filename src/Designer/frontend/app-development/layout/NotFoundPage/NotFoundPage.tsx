import { StudioNotFoundPage, StudioParagraph } from '@studio/components';
import { Link } from '@digdir/designsystemet-react';
import { useTranslation, Trans } from 'react-i18next';

export const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <StudioNotFoundPage
      title={t('not_found_page.heading')}
      body={
        <StudioParagraph data-size='sm'>
          <Trans
            i18nKey='not_found_page.text'
            components={{
              a: <Link href='/info/contact'> </Link>,
            }}
          ></Trans>
        </StudioParagraph>
      }
      redirectHref='/'
      redirectLinkText={t('not_found_page.redirect_to_dashboard')}
    />
  );
};
