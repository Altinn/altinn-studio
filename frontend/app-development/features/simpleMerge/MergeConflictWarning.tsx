import React, { useRef, useState } from 'react';
import classes from './MergeConflictWarning.module.css';
import { Download } from '@navikt/ds-icons';
import { ButtonContainer } from 'app-shared/primitives';
import { DownloadRepoModal } from './DownloadRepoModal';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioPopover } from '@studio/components';
import { RemoveChangesPopoverContent } from './RemoveChangesPopoverContent';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const MergeConflictWarning = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const [resetRepoModalOpen, setResetRepoModalOpen] = useState<boolean>(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);

  const downloadModalAnchor = useRef<HTMLButtonElement>();

  const toggleDownloadModal = () => setDownloadModalOpen((currentValue: boolean) => !currentValue);
  const toggleResetModal = () => setResetRepoModalOpen((currentValue: boolean) => !currentValue);

  return (
    <div className={classes.container} role='dialog'>
      <Heading level={1} spacing size='large'>
        {t('merge_conflict.headline')}
      </Heading>
      <Paragraph size='small' spacing>
        {t('merge_conflict.body1')}{' '}
      </Paragraph>
      <Paragraph size='small' spacing>
        {t('merge_conflict.body2')}
      </Paragraph>
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
        <StudioPopover open={true /*resetRepoModalOpen*/} onClose={toggleResetModal}>
          <StudioPopover.Trigger onClick={toggleResetModal} size='small'>
            {t('merge_conflict.remove_my_changes')}
          </StudioPopover.Trigger>
          <StudioPopover.Content>
            <RemoveChangesPopoverContent repositoryName={app} onClose={toggleResetModal} />
          </StudioPopover.Content>
        </StudioPopover>
      </ButtonContainer>
    </div>
  );
};
