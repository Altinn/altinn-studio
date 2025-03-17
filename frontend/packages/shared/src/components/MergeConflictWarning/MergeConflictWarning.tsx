import React, { useState } from 'react';
import classes from './MergeConflictWarning.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { StudioPopover } from '@studio/components';
import { RemoveChangesPopoverContent } from './RemoveChangesPopoverContent';
import { Heading, Link, Paragraph } from '@digdir/designsystemet-react';
import { repoDownloadPath } from 'app-shared/api/paths';

export type MergeConflictWarningProps = {
  owner: string;
  repoName: string;
};

export const MergeConflictWarning = ({ owner, repoName }: MergeConflictWarningProps) => {
  const { t } = useTranslation();

  const [resetRepoPopoverOpen, setResetRepoPopoverOpen] = useState<boolean>(false);

  const toggleResetModal = () => setResetRepoPopoverOpen((currentValue: boolean) => !currentValue);

  return (
    <div className={classes.container} role='dialog'>
      <Heading level={1} spacing size='large'>
        {t('merge_conflict.headline')}
      </Heading>
      <Paragraph size='small' spacing>
        <Trans key='merge_conflict.body1'>
          Noen andre har endret appen på samme sted som deg. Hvis <strong>Del endringer</strong>{' '}
          ikke fungerer, kan du laste ned en zip-fil med endringene dine.
        </Trans>
      </Paragraph>
      <Link className={classes.link} href={repoDownloadPath(owner, repoName)}>
        {t('overview.download_repo_changes')}
      </Link>
      <Link className={classes.link} href={repoDownloadPath(owner, repoName, true)}>
        {t('overview.download_repo_full')}
      </Link>
      <Paragraph size='small' spacing>
        <Trans key='merge_conflict.body2'>
          Velg <strong>Slett mine endringer</strong> for å løse konflikten.
        </Trans>
      </Paragraph>
      <div className={classes.buttonContainer}>
        <StudioPopover open={resetRepoPopoverOpen} onClose={toggleResetModal}>
          <StudioPopover.Trigger onClick={toggleResetModal} size='small'>
            {t('merge_conflict.remove_my_changes')}
          </StudioPopover.Trigger>
          <StudioPopover.Content>
            <RemoveChangesPopoverContent
              onClose={toggleResetModal}
              owner={owner}
              repoName={repoName}
            />
          </StudioPopover.Content>
        </StudioPopover>
      </div>
    </div>
  );
};
