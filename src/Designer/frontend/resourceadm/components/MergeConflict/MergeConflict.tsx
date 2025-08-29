import React from 'react';
import classes from './MergeConflict.module.css';
import { useTranslation } from 'react-i18next';
import { repoDownloadPath } from 'app-shared/api/paths';
import {
  StudioButton,
  StudioHeading,
  StudioLabelAsParagraph,
  StudioLink,
  StudioParagraph,
} from '@studio/components-legacy';
import { useResetRepositoryMutation } from '../../hooks/mutations';

type MergeConflictProps = {
  /**
   * The name of the organisation
   */
  org: string;
  /**
   * The name of the repo
   */
  repo: string;
};

/**
 * @component
 *    Displays the a message telling the user that there is a merge conflict
 *
 * @property {string}[org] - The name of the organisation
 * @property {string}[repo] - The name of the repo
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const MergeConflict = ({ org, repo }: MergeConflictProps): React.JSX.Element => {
  const { t } = useTranslation();

  const { mutate: resetRepo, isPending: isRemovingChanges } = useResetRepositoryMutation(org, repo);

  /**
   * Function that resets the repo
   */
  const handleClickResetRepo = () => {
    if (!isRemovingChanges) {
      resetRepo(undefined, {
        onSuccess: () => window.location.reload(),
      });
    }
  };

  return (
    <div className={classes.mergeConflictWrapper}>
      <StudioHeading size='lg'>{t('resourceadm.merge_conflict_header')}</StudioHeading>
      <StudioParagraph size='sm' spacing>
        {t('resourceadm.merge_conflict_body')}
      </StudioParagraph>
      <div className={classes.downloadWrapper}>
        <StudioLabelAsParagraph size='md' weight='medium'>
          {t('merge_conflict.download')}
        </StudioLabelAsParagraph>
        <StudioLink href={repoDownloadPath(org, repo)}>
          {t('merge_conflict.download_edited_files')}
        </StudioLink>
        <StudioLink href={repoDownloadPath(org, repo, true)}>
          {t('merge_conflict.download_entire_repo')}
        </StudioLink>
        <StudioParagraph size='sm' spacing>
          {t('resourceadm.merge_conflict_footer')}
        </StudioParagraph>
      </div>
      <div>
        <StudioButton onClick={handleClickResetRepo}>
          {t('merge_conflict.remove_my_changes')}
        </StudioButton>
      </div>
    </div>
  );
};
