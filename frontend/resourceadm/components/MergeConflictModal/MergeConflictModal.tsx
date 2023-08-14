import React, { useState } from 'react';
import classes from './MergeConflictModal.module.css';
import { useTranslation } from 'react-i18next';
import { Button, Paragraph } from '@digdir/design-system-react';
import { Download } from '@navikt/ds-icons';
import { repoDownloadPath, repoResetPath } from 'app-shared/api/paths';
import { RemoveChangesModal } from './RemoveChangesModal';
import { get } from 'app-shared/utils/networking';
import { Link } from '../Link';
import { Modal } from '../Modal';

interface Props {
  isOpen: boolean;
  handleSolveMerge: () => void;
  org: string;
  repo: string;
}

/**
 * Displays the modal telling the user that there is a merge conflict
 *
 * @param props.isOpen boolean for if the modal is open or not
 * @param props.onSolveMerge function to be executed when the merge is solved
 * @param props.org the name of the organisation
 * @param props.repo the name of the repo
 */
export const MergeConflictModal = ({
  isOpen,
  handleSolveMerge: onSolveMerge,
  org,
  repo,
}: Props) => {
  const { t } = useTranslation();

  const [resetModalOpen, setResetModalOpen] = useState(false);

  /**
   * Function that resets the repo
   */
  const handleClickResetRepo = () => {
    get(repoResetPath(org, repo));
    onSolveMerge();
  };

  // TODO - more translation
  return (
    <Modal isOpen={isOpen} title={t('merge_conflict.headline')}>
      <Paragraph size='small'>{t('merge_conflict.body1')}</Paragraph>
      <Paragraph size='small'>{t('merge_conflict.body2')}</Paragraph>
      <div className={classes.buttonWrapper}>
        <div className={classes.downloadWrapper}>
          <Paragraph size='small'>{t('merge_conflict.download')}</Paragraph>
          <Link
            href={repoDownloadPath(org, repo)}
            text='Last ned endret fil(er)'
            icon={<Download title='Download changed file' fontSize='1.3rem' />}
          />
          <div className={classes.linkDivider}>
            <Link
              href={repoDownloadPath(org, repo, true)}
              text='Last ned hele repoet'
              icon={<Download title='Download whole repo' fontSize='1.3rem' />}
            />
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
