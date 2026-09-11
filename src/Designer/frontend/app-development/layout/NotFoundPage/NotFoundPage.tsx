import { StudioLink, StudioNotFoundPage, StudioParagraph } from '@studio/components';
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
              a: <StudioLink href='/info/contact'> </StudioLink>,
            }}
          ></Trans>
        </StudioParagraph>
      }
      redirectHref='/'
      redirectLinkText={t('not_found_page.redirect_to_dashboard')}
    />
  );
};
