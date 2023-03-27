import React, { useRef, useState } from 'react';
import classes from './MergeConflictWarning.module.css';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { Download } from '@navikt/ds-icons';
import { ButtonContainer } from 'app-shared/primitives';
import { DownloadRepoModal } from '../administration/components/DownloadRepoModal';
import { ResetRepoModal } from '../administration/components/ResetRepoModal';
import { RepoStatusActions } from '../../sharedResources/repoStatus/repoStatusSlice';
import { useAppDispatch } from '../../common/hooks';

interface MergeConflictWarningProps {
  org: string;
  app: string;
}

export const MergeConflictWarning = ({ org, app }: MergeConflictWarningProps) => {
  const dispatch = useAppDispatch();
  const [resetRepoModalOpen, setResetRepoModalOpen] = useState<boolean>(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);
  const toggleDownloadModal = () => setDownloadModalOpen(!downloadModalOpen);
  const toggleResetModal = () => setResetRepoModalOpen(!resetRepoModalOpen);
  const handleResetRepoClick = () => dispatch(RepoStatusActions.resetLocalRepo({ org, repo: app }));
  const downloadModalAnchor = useRef<HTMLButtonElement>();
  const resetRepoModalAnchor = useRef<HTMLButtonElement>();
  return (
    <div className={classes.container} role='dialog'>
      <h1>Det er en konflikt i applikasjonen</h1>
      <p>Det finnes endringer i denne applikasjonen som er i konflikt med dine siste endringer.</p>
      <p>
        Måten å løse konflikten på er å fjerne dine siste endringer. Dersom du vil finne tilbake til
        endringene du nå mister, kan du laste ned siste versjon som zip-fil.
      </p>
      <Button
        variant={ButtonVariant.Quiet}
        icon={<Download />}
        iconPlacement={'right'}
        onClick={toggleDownloadModal}
        ref={downloadModalAnchor}
      >
        Last ned zip-fil
      </Button>
      <DownloadRepoModal
        anchorRef={downloadModalAnchor}
        onClose={toggleDownloadModal}
        open={downloadModalOpen}
        org={org}
        app={app}
      />
      <ButtonContainer className={classes.buttonContainer}>
        <Button ref={resetRepoModalAnchor} onClick={toggleResetModal}>
          Fjern mine endringer
        </Button>
        <ResetRepoModal
          anchorRef={resetRepoModalAnchor}
          handleClickResetRepo={handleResetRepoClick}
          onClose={toggleResetModal}
          open={resetRepoModalOpen}
          repositoryName={app}
        />
      </ButtonContainer>
    </div>
  );
};
