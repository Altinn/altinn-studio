import React, { useState } from 'react';
import classes from './MergeConflictModal.module.css';
import Modal from 'react-modal';
import { useTranslation } from 'react-i18next';
import { Button } from '@digdir/design-system-react';
import { Download } from '@navikt/ds-icons';
import { repoDownloadPath, repoResetPAth } from 'app-shared/api/paths';
import { RemoveChangesModal } from './RemoveChangesModal/RemoveChangesModal';
import { get } from 'app-shared/utils/networking';

/**
 * Style the modal
 */
const modalStyles = {
  content: {
    width: '800px',
    height: 'fit-content',
    margin: 'auto',
    paddingBlock: '40px',
    paddingInline: '70px',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
};

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
   * Handles the download of only the file(s) changed
   */
  const handleDownloadChangedFilesZIP = () => {
    window.location.href = repoDownloadPath(org, repo);
  };

  /**
   * Handles the download of all the files in the repo
   */
  const handleDownloadRepoZIP = () => {
    window.location.href = repoDownloadPath(org, repo, true);
  };

  /**
   * Function that resets the repo
   */
  const handleClickResetRepo = () => {
    get(repoResetPAth(org, repo));
    onSolveMerge();
  };

  // TODO - more translation
  return (
    <Modal
      isOpen={isOpen}
      contentLabel='Merge Conflict Modal'
      style={modalStyles}
      ariaHideApp={false}
    >
      <h2 className={classes.modalHeader}>{t('merge_conflict.headline')}</h2>
      <p className={classes.bodyText}>{t('merge_conflict.body1')} </p>
      <p className={classes.bodyText}>{t('merge_conflict.body2')}</p>
      <div className={classes.buttonWrapper}>
        <Button
          variant='quiet'
          icon={<Download title='Download changed file' />}
          iconPlacement='right'
          onClick={handleDownloadChangedFilesZIP}
        >
          {'Last ned kun endret fil(er)'}
        </Button>
        <Button
          variant='quiet'
          icon={<Download title='Download whole repo' />}
          iconPlacement='right'
          onClick={handleDownloadRepoZIP}
        >
          {'Last ned hele repoet'}
        </Button>
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
