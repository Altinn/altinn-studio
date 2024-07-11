import React, { useState } from 'react';
import classes from './MergeConflictWarning.module.css';
import { useTranslation } from 'react-i18next';
import { StudioPopover } from '@studio/components';
import { RemoveChangesPopoverContent } from './RemoveChangesPopoverContent';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { DownloadRepoPopoverContent } from './DownloadRepoPopoverContent';

export const MergeConflictWarning = () => {
  const { t } = useTranslation();

  const [resetRepoPopoverOpen, setResetRepoPopoverOpen] = useState<boolean>(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);

  const toggleDownloadModal = () => setDownloadModalOpen((currentValue: boolean) => !currentValue);
  const toggleResetModal = () => setResetRepoPopoverOpen((currentValue: boolean) => !currentValue);

  return (
    <div className={classes.container} role='dialog'>
      <Heading level={1} spacing size='large'>
        {t('merge_conflict.headline')}
      </Heading>
      <Paragraph size='small' spacing>
        {t('merge_conflict.body1')}
      </Paragraph>
      <Paragraph size='small' spacing>
        {t('merge_conflict.body2')}
      </Paragraph>
      <StudioPopover open={downloadModalOpen} onClose={toggleDownloadModal}>
        <StudioPopover.Trigger onClick={toggleDownloadModal} size='small' variant='tertiary'>
          {t('merge_conflict.download_zip_file')}
        </StudioPopover.Trigger>
        <StudioPopover.Content>
          <DownloadRepoPopoverContent onClose={toggleDownloadModal} />
        </StudioPopover.Content>
      </StudioPopover>
      <div className={classes.buttonContainer}>
        <StudioPopover open={resetRepoPopoverOpen} onClose={toggleResetModal}>
          <StudioPopover.Trigger onClick={toggleResetModal} size='small'>
            {t('merge_conflict.remove_my_changes')}
          </StudioPopover.Trigger>
          <StudioPopover.Content>
            <RemoveChangesPopoverContent onClose={toggleResetModal} />
          </StudioPopover.Content>
        </StudioPopover>
      </div>
    </div>
  );
};
