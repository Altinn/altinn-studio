import React, { useRef, forwardRef } from 'react';
import classes from './MergeConflictModal.module.css';
import { useTranslation } from 'react-i18next';
import { Button, Link, Paragraph, Label } from '@digdir/design-system-react';
import { repoDownloadPath, repoResetPath } from 'app-shared/api/paths';
import { RemoveChangesModal } from './RemoveChangesModal';
import { get } from 'app-shared/utils/networking';
import { Modal } from '../Modal';

type MergeConflictModalProps = {
  handleSolveMerge: () => void;
  org: string;
  repo: string;
};

/**
 * @component
 *    Displays the modal telling the user that there is a merge conflict
 *
 * @property {function}[handleSolveMerge] - Function to be executed when the merge is solved
 * @property {string}[org] - The name of the organisation
 * @property {string}[repo] - The name of the repo
 *
 * @returns {JSX.Element} - The rendered component
 */
export const MergeConflictModal = forwardRef<HTMLDialogElement, MergeConflictModalProps>(
  ({ handleSolveMerge, org, repo }, ref): JSX.Element => {
    const { t } = useTranslation();

    const removeChangesModalRef = useRef<HTMLDialogElement>(null);

    const handleClickResetRepo = () => {
      get(repoResetPath(org, repo));
      handleSolveMerge();
    };

    return (
      <Modal ref={ref} title={t('merge_conflict.headline')}>
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
          <Button onClick={() => removeChangesModalRef.current?.showModal()} size='small'>
            {t('merge_conflict.remove_my_changes')}
          </Button>
          <RemoveChangesModal
            ref={removeChangesModalRef}
            onClose={() => removeChangesModalRef.current?.close()}
            handleClickResetRepo={handleClickResetRepo}
            repo={repo}
          />
        </div>
      </Modal>
    );
  },
);

MergeConflictModal.displayName = 'MergeConflictModal';
