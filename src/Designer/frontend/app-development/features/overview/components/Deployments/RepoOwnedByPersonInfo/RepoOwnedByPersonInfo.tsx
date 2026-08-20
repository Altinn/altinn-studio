import { StudioParagraph, StudioLink, StudioAlert } from '@studio/components';
import { Trans, useTranslation } from 'react-i18next';
import classes from './RepoOwnedByPersonInfo.module.css';

export const RepoOwnedByPersonInfo = () => {
  const { t } = useTranslation();
  return (
    <>
      <StudioAlert>{t('app_deployment.private_app_owner')}</StudioAlert>
      <div className={classes.infoContainer}>
        <div className={classes.textContainer}>
          <StudioParagraph>{t('app_deployment.private_app_owner_info')}</StudioParagraph>
          <StudioParagraph>
            <Trans
              i18nKey={'app_deployment.private_app_owner_help'}
              components={{ a: <StudioLink href='/info/contact'> </StudioLink> }}
            />
          </StudioParagraph>
          <StudioParagraph>{t('app_deployment.private_app_owner_options')}</StudioParagraph>
        </div>
      </div>
    </>
  );
};
