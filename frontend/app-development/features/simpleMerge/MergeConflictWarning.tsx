import React, { useRef, useState } from 'react';
import classes from './MergeConflictWarning.module.css';
import { Download } from '@navikt/ds-icons';
import { ButtonContainer } from 'app-shared/primitives';
import { DownloadRepoModal } from './DownloadRepoModal';
import { ResetRepoModal } from './ResetRepoModal';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';

interface MergeConflictWarningProps {
  org: string;
  app: string;
}

export const MergeConflictWarning = ({ org, app }: MergeConflictWarningProps) => {
  const [resetRepoModalOpen, setResetRepoModalOpen] = useState<boolean>(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);
  const { t } = useTranslation();
  const toggleDownloadModal = () => setDownloadModalOpen(!downloadModalOpen);
  const toggleResetModal = () => setResetRepoModalOpen(!resetRepoModalOpen);
  const downloadModalAnchor = useRef<HTMLButtonElement>();
  const resetRepoModalAnchor = useRef<HTMLButtonElement>();
  return (
    <div className={classes.container} role='dialog'>
      <h1>{t('merge_conflict.headline')}</h1>
      <p>{t('merge_conflict.body1')} </p>
      <p>{t('merge_conflict.body2')}</p>
      <StudioButton
        variant='tertiary'
        icon={<Download />}
        iconPlacement='right'
        onClick={toggleDownloadModal}
        ref={downloadModalAnchor}
        size='small'
      >
        {t('merge_conflict.download_zip_file')}
      </StudioButton>
      <DownloadRepoModal
        anchorRef={downloadModalAnchor}
        onClose={toggleDownloadModal}
        open={downloadModalOpen}
        org={org}
        app={app}
      />
      <ButtonContainer className={classes.buttonContainer}>
        <StudioButton ref={resetRepoModalAnchor} onClick={toggleResetModal} size='small'>
          {t('merge_conflict.remove_my_changes')}
        </StudioButton>
        <ResetRepoModal
          anchorRef={resetRepoModalAnchor}
          onClose={toggleResetModal}
          open={resetRepoModalOpen}
          repositoryName={app}
          org={org}
        />
      </ButtonContainer>
    </div>
  );
};
