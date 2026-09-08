import { repositoryGitPath } from 'app-shared/api/paths';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './ClonePopoverContent.module.css';
import { useTranslation } from 'react-i18next';
import { useDataModelsXsdQuery } from 'app-shared/hooks/queries';
import { InformationSquareFillIcon } from '@studio/icons';
import {
  StudioButton,
  StudioLabelAsParagraph,
  StudioTextfield,
  StudioParagraph,
  StudioLink,
} from '@studio/components';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useGiteaHeaderContext } from '../../context/GiteaHeaderContext';

export const ClonePopoverContent = () => {
  const { owner, repoName } = useGiteaHeaderContext();
  const { data: dataModel = [] } = useDataModelsXsdQuery(owner, repoName);
  const { t } = useTranslation();
  const packagesRouter = new PackagesRouter({ app: repoName, org: owner });

  const gitUrl = window.location.origin.toString() + repositoryGitPath(owner, repoName);
  const copyGitUrl = () => navigator.clipboard.writeText(gitUrl);
  const canCopy = navigator.clipboard ? true : false;

  return (
    <div className={classes.modalContainer}>
      <StudioLabelAsParagraph data-size='sm'>
        {t('sync_header.favorite_tool')}
      </StudioLabelAsParagraph>
      <StudioLink
        href={altinnDocsUrl({ language: 'nb' })}
        target='_blank'
        rel='noopener noreferrer'
      >
        {t('sync_header.favorite_tool_link')}
      </StudioLink>

      {dataModel.length === 0 && (
        <>
          <div className={classes.iconAndText}>
            <InformationSquareFillIcon className={classes.infoIcon} />
            <StudioParagraph>{t('sync_header.data_model_missing')}</StudioParagraph>
          </div>
          <StudioParagraph spacing>{t('sync_header.data_model_missing_helper')}</StudioParagraph>
          <StudioLink href={packagesRouter.getPackageNavigationUrl('dataModel')}>
            {t('sync_header.data_model_missing_link')}
          </StudioLink>
        </>
      )}
      <StudioTextfield readOnly value={gitUrl} label={t('sync_header.clone_https')} />
      {canCopy && (
        <div>
          <StudioButton fullWidth onClick={copyGitUrl} className={classes.button}>
            {t('sync_header.clone_https_button')}
          </StudioButton>
        </div>
      )}
    </div>
  );
};
