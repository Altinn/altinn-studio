import React, { useState } from 'react';
import classes from './MergeConflictModal.module.css';
import { useTranslation } from 'react-i18next';
import { Button, Link, Paragraph, Label } from '@digdir/design-system-react';
import { repoDownloadPath, repoResetPath } from 'app-shared/api/paths';
import { RemoveChangesModal } from './RemoveChangesModal';
import { get } from 'app-shared/utils/networking';
import { Modal } from '../Modal';

interface Props {
  /**
   * Boolean for if the modal is open
   */
  isOpen: boolean;
  /**
   * Function to be executed when the merge is solved
   * @returns void
   */
  handleSolveMerge: () => void;
  /**
   * The name of the organisation
   */
  org: string;
  /**
   * The name of the repo
   */
  repo: string;
}

/**
 * @component
 *    Displays the modal telling the user that there is a merge conflict
 *
 * @property {boolean}[isOpen] - Boolean for if the modal is open
 * @property {function}[handleSolveMerge] - Function to be executed when the merge is solved
 * @property {string}[org] - The name of the organisation
 * @property {string}[repo] - The name of the repo
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const MergeConflictModal = ({
  isOpen,
  handleSolveMerge,
  org,
  repo,
}: Props): React.ReactNode => {
  const { t } = useTranslation();

  const [resetModalOpen, setResetModalOpen] = useState(false);

  /**
   * Function that resets the repo
   */
  const handleClickResetRepo = () => {
    get(repoResetPath(org, repo));
    handleSolveMerge();
  };

  // TODO - more translation
  return (
    <Modal isOpen={isOpen} title={t('merge_conflict.headline')}>
      <Paragraph size='small'>{t('merge_conflict.body1')}</Paragraph>
      <Paragraph size='small'>{t('merge_conflict.body2')}</Paragraph>
      <div className={classes.buttonWrapper}>
        <div className={classes.downloadWrapper}>
          <Label size='medium' spacing weight='medium'>
            {t('merge_conflict.download')}
          </Label>
          <Link href={repoDownloadPath(org, repo)}>
            {t('merge_conflict.download_edited_files')}
          </Link>
          <div className={classes.linkDivider}>
            <Link href={repoDownloadPath(org, repo, true)}>
              {t('merge_conflict.download_entire_repo')}
            </Link>
          </div>
        </div>
        <Button onClick={() => setResetModalOpen(true)}>
          {t('merge_conflict.remove_my_changes')}
        </Button>
        <RemoveChangesModal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          handleClickResetRepo={handleClickResetRepo}
          repo={repo}
        />
      </div>
    </Modal>
  );
};
