import type { ReactElement } from 'react';
import classes from './BuildSource.module.css';
import { useTranslation } from 'react-i18next';
import { StudioCard, StudioHeading, StudioLink, StudioTag } from '@studio/components';
import { DateUtils } from '@studio/pure-functions';
import { gitCommitPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { BranchStatus } from 'app-shared/types/BranchStatus';

export type BuildSourceProps = {
  branchName: string;
  branchStatus?: BranchStatus;
};

export function BuildSource({ branchName, branchStatus }: BuildSourceProps): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  return (
    <StudioCard className={classes.buildSource} data-color='neutral'>
      <StudioHeading level={2} data-size='2xs'>
        {t('app_release.build_source_title')}
      </StudioHeading>
      <dl className={classes.details}>
        <dt>{t('app_release.build_source_branch')}</dt>
        <dd>
          <StudioTag data-color='info' data-size='sm'>
            {branchName}
          </StudioTag>
        </dd>
        {branchStatus && (
          <>
            <dt>{t('app_release.build_source_last_shared')}</dt>
            <dd>
              <time dateTime={branchStatus.commit.timestamp}>
                {DateUtils.formatDateTime(branchStatus.commit.timestamp)}
              </time>
            </dd>
            <dt>{t('app_release.build_source_commit_message')}</dt>
            <dd>
              <StudioLink
                href={gitCommitPath(org, app, branchStatus.commit.id)}
                target='_blank'
                rel='noopener noreferrer'
              >
                {getCommitTitle(branchStatus.commit.message)}
              </StudioLink>
            </dd>
          </>
        )}
      </dl>
    </StudioCard>
  );
}

function getCommitTitle(commitMessage: string): string {
  return commitMessage.split('\n')[0];
}
