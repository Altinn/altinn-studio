import React, { useState } from 'react';
import classes from './MergeConflictWarning.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { StudioParagraph, StudioPopover, StudioHeading, StudioLink } from '@studio/components';
import { RemoveChangesPopoverContent } from './RemoveChangesPopoverContent';
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
      <StudioHeading level={1} spacing>
        {t('merge_conflict.headline')}
      </StudioHeading>
      <StudioParagraph spacing>
        <Trans key='merge_conflict.body1'>
          Noen andre har endret appen på samme sted som deg. Hvis <strong>Del endringer</strong>{' '}
          ikke fungerer, kan du laste ned en zip-fil med endringene dine.
        </Trans>
      </StudioParagraph>
      <StudioLink className={classes.link} href={repoDownloadPath(owner, repoName)}>
        {t('overview.download_repo_changes')}
      </StudioLink>
      <StudioLink className={classes.link} href={repoDownloadPath(owner, repoName, true)}>
        {t('overview.download_repo_full')}
      </StudioLink>
      <StudioParagraph spacing>
        <Trans key='merge_conflict.body2'>
          Velg <strong>Slett mine endringer</strong> for å løse konflikten.
        </Trans>
      </StudioParagraph>
      <div className={classes.buttonContainer}>
        <StudioPopover.TriggerContext>
          <StudioPopover.Trigger onClick={toggleResetModal}>
            {t('merge_conflict.remove_my_changes')}
          </StudioPopover.Trigger>
          <StudioPopover open={resetRepoPopoverOpen} onClose={() => setResetRepoPopoverOpen(false)}>
            {resetRepoPopoverOpen && (
              <RemoveChangesPopoverContent
                onClose={() => setResetRepoPopoverOpen(false)}
                owner={owner}
                repoName={repoName}
              />
            )}
          </StudioPopover>
        </StudioPopover.TriggerContext>
      </div>
    </div>
  );
};
