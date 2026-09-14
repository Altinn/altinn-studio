import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  StudioAlert,
  StudioBlobDownloader,
  StudioButton,
  StudioDetails,
  StudioHeading,
  StudioLink,
  StudioLinkButton,
  StudioList,
  StudioParagraph,
  StudioSpinner,
  StudioTag,
} from '@studio/components';
import { TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useAppUpgradeStatusQuery } from '../../hooks/queries/useAppUpgradeStatusQuery';
import { useStartAppUpgradeMutation } from '../../hooks/mutations/useStartAppUpgradeMutation';
import { useAppUpgradeRunQuery } from '../../hooks/queries/useAppUpgradeRunQuery';
import { useMergeAppUpgradeMutation } from '../../hooks/mutations/useMergeAppUpgradeMutation';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { useSubroute } from '../../hooks/useSubRoute';
import { CenterContainer } from '../../components/CenterContainer';
import type {
  AppUpgradeManualTask,
  AppUpgradeMessageStatus,
  AppUpgradeResult,
  AppUpgradeRun,
  AppUpgradeStart,
} from 'app-shared/types/AppUpgrade';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { APP_DEVELOPMENT_BASENAME, NEXT_V9_VERSION } from 'app-shared/constants';
import { storeAssistantPromptHandoff } from 'app-shared/utils/assistantPromptHandoff';
import { buildManualTasksText, buildMarkdownReport, groupManualTasksByStep } from './upgradeReport';
import { UpgradeStepper } from './UpgradeStepper';
import type { UpgradeStep } from './UpgradeStepper';
import { UpgradeFileChanges } from './UpgradeFileChanges';
import { UpgradeBreadcrumbs } from './UpgradeBreadcrumbs';
import classes from './AppUpgradePage.module.css';

type Phase = 'intro' | 'starting' | UpgradeStep;

const resolvePhase = (
  startedBranch: string | null,
  start: AppUpgradeStart | undefined,
  startFailed: boolean,
  run: AppUpgradeRun | undefined,
  runFailed: boolean,
): Phase => {
  if (startedBranch === null) {
    return start !== undefined || startFailed ? 'starting' : 'intro';
  }
  return run?.state === 'Completed' || runFailed ? 'done' : 'upgrade';
};

export const AppUpgradePage = (): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useParams<{ org: string; app: string }>();
  const selectedContext = useSelectedContext();
  const subroute = useSubroute();
  const navigate = useNavigate();
  const [startedBranch, setStartedBranch] = useState<string | null>(null);
  const { data: status } = useAppUpgradeStatusQuery(org, app);
  const start = useStartAppUpgradeMutation(org, app);
  const runQuery = useAppUpgradeRunQuery(org, app, startedBranch);
  const phase = resolvePhase(
    startedBranch,
    start.data,
    start.isError,
    runQuery.data,
    runQuery.isError,
  );
  const targetVersion = status?.targetMajorVersion ?? NEXT_V9_VERSION;
  const packagesRouter = new PackagesRouter({ org, app });
  const dashboardPath = `/${subroute}/${selectedContext}`;

  const goToDashboard = (): void => {
    navigate(dashboardPath);
  };

  const startUpgrade = (): void => {
    start.mutate(undefined, {
      onSuccess: (started) => {
        if (started.status === 'Started' && started.branchName)
          setStartedBranch(started.branchName);
      },
    });
  };

  return (
    <CenterContainer>
      <div className={classes.page}>
        <UpgradeBreadcrumbs
          dashboardPath={dashboardPath}
          appName={app}
          appUrl={packagesRouter.getPackageNavigationUrl('editorOverview')}
          currentPageName={t('app_upgrade.menu_item', { version: targetVersion })}
        />
        <StudioHeading level={1} data-size='md'>
          {t('app_upgrade.page_title', { app, version: targetVersion })}
        </StudioHeading>
        {phase === 'intro' && (
          <Intro
            app={app}
            targetVersion={targetVersion}
            canStart={status?.isAutomaticUpgradeSupported ?? false}
            isAutomatic={(status?.isAutomaticUpgradeSupported ?? false) && !status?.hasCustomCode}
            onStart={startUpgrade}
            onCancel={goToDashboard}
          />
        )}
        {phase === 'starting' && (
          <Starting
            start={start.data}
            isPending={start.isPending}
            isError={start.isError}
            onCancel={goToDashboard}
          />
        )}
        {(phase === 'upgrade' || phase === 'done') && (
          <div className={classes.content}>
            <UpgradeStepper activeStep={phase} />
            {phase === 'upgrade' ? (
              <UpgradeInProgress run={runQuery.data} onCancel={goToDashboard} />
            ) : (
              <Done
                org={org}
                app={app}
                result={runQuery.data?.result ?? undefined}
                runUrl={runQuery.data?.runUrl ?? null}
                requestFailed={runQuery.isError}
                publishUrl={packagesRouter.getPackageNavigationUrl('editorPublish')}
                onClose={goToDashboard}
              />
            )}
          </div>
        )}
      </div>
    </CenterContainer>
  );
};

type IntroProps = {
  app: string;
  targetVersion: number;
  canStart: boolean;
  isAutomatic: boolean;
  onStart: () => void;
  onCancel: () => void;
};

const Intro = ({
  app,
  targetVersion,
  canStart,
  isAutomatic,
  onStart,
  onCancel,
}: IntroProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <div className={classes.content}>
      <StudioHeading level={2} data-size='xs'>
        {t(isAutomatic ? 'app_upgrade.intro.title_automatic' : 'app_upgrade.intro.title')}
      </StudioHeading>
      {isAutomatic ? (
        <StudioParagraph>
          {t('app_upgrade.intro.description_automatic')}
          <br />
          <strong>{app}</strong>
        </StudioParagraph>
      ) : (
        <StudioParagraph>
          {t('app_upgrade.intro.description', { version: targetVersion })}
        </StudioParagraph>
      )}
      <div>
        <StudioParagraph>
          {t('app_upgrade.intro.version_contains', { version: targetVersion })}
        </StudioParagraph>
        <StudioList.Unordered className={classes.taskList}>
          <StudioList.Item>{t('app_upgrade.intro.feature_design_system')}</StudioList.Item>
          <StudioList.Item>{t('app_upgrade.intro.feature_process_engine')}</StudioList.Item>
        </StudioList.Unordered>
      </div>
      {!canStart && (
        <StudioAlert data-color='info'>{t('app_upgrade.intro.unsupported')}</StudioAlert>
      )}
      <Actions>
        <StudioButton onClick={onStart} disabled={!canStart}>
          {t('app_upgrade.intro.start')}
        </StudioButton>
        <StudioButton variant='secondary' onClick={onCancel}>
          {t('general.cancel')}
        </StudioButton>
      </Actions>
    </div>
  );
};

type StartingProps = {
  start?: AppUpgradeStart;
  isPending: boolean;
  isError: boolean;
  onCancel: () => void;
};

const Starting = ({ start, isPending, isError, onCancel }: StartingProps): ReactElement => {
  const { t } = useTranslation();
  const isBlocked = isError || (start !== undefined && start.status !== 'Started');

  return (
    <div className={classes.content}>
      <StudioHeading level={2} data-size='xs'>
        {t('app_upgrade.starting.title')}
      </StudioHeading>
      {isBlocked ? (
        <>
          <StudioParagraph>{t('app_upgrade.starting.blocked')}</StudioParagraph>
          <StudioAlert data-color='warning'>
            {isError ? t('app_upgrade.starting.request_failed') : t(blockedReasonKey(start))}
          </StudioAlert>
          <Actions>
            <StudioButton variant='secondary' onClick={onCancel}>
              {t('app_upgrade.done.back_to_dashboard')}
            </StudioButton>
          </Actions>
        </>
      ) : (
        <>
          <StudioParagraph>{t('app_upgrade.starting.description')}</StudioParagraph>
          <StatusLine icon={<StudioSpinner aria-label={t('general.loading')} data-size='xs' />}>
            {t('app_upgrade.starting.queuing')}
          </StatusLine>
          <Actions>
            <StudioButton disabled>{t('app_upgrade.next')}</StudioButton>
            {isPending && <CancelUpgradeButton onClick={onCancel} />}
          </Actions>
        </>
      )}
    </div>
  );
};

const blockedReasonKey = (start?: AppUpgradeStart): string => {
  switch (start?.status) {
    case 'UnsupportedVersion':
      return 'app_upgrade.starting.unsupported';
    default:
      return 'app_upgrade.starting.failed';
  }
};

type UpgradeInProgressProps = {
  run?: AppUpgradeRun;
  onCancel: () => void;
};

const UpgradeInProgress = ({ run, onCancel }: UpgradeInProgressProps): ReactElement => {
  const { t } = useTranslation();
  const statusText =
    run?.state === 'Running'
      ? run.currentStep
        ? t('app_upgrade.upgrade.running_step', { step: run.currentStep })
        : t('app_upgrade.upgrade.running')
      : t('app_upgrade.upgrade.queued');
  return (
    <>
      <StudioParagraph>{t('app_upgrade.upgrade.in_progress')}</StudioParagraph>
      <StatusLine icon={<StudioSpinner aria-label={t('general.loading')} data-size='xs' />}>
        {statusText}
      </StatusLine>
      {run?.runUrl && (
        <StudioLink href={run.runUrl} target='_blank' rel='noreferrer'>
          {t('app_upgrade.upgrade.view_run')}
        </StudioLink>
      )}
      <Actions>
        <StudioButton disabled>{t('app_upgrade.next')}</StudioButton>
        <StudioButton variant='secondary' onClick={onCancel}>
          {t('app_upgrade.done.back_to_dashboard')}
        </StudioButton>
      </Actions>
    </>
  );
};

type DoneProps = {
  org: string;
  app: string;
  result?: AppUpgradeResult;
  runUrl: string | null;
  requestFailed: boolean;
  publishUrl: string;
  onClose: () => void;
};

const Done = ({
  org,
  app,
  result,
  runUrl,
  requestFailed,
  publishUrl,
  onClose,
}: DoneProps): ReactElement => {
  const { t } = useTranslation();
  const merge = useMergeAppUpgradeMutation(org, app);
  const targetVersion = result?.targetMajorVersion ?? NEXT_V9_VERSION;

  const goToAssistant = (): void => {
    const prompt =
      result?.outcome === 'ManualStepsRequired'
        ? t('app_upgrade.assistant_prompt', {
            version: targetVersion,
            branch: result.branchName,
            tasks: buildManualTasksText(result.manualTasks),
            interpolation: { escapeValue: false },
          })
        : t('app_upgrade.assistant_prompt_failed', {
            version: targetVersion,
            message: result?.message ?? t('app_upgrade.starting.request_failed'),
            interpolation: { escapeValue: false },
          });
    storeAssistantPromptHandoff(org, app, prompt);
    window.location.assign(
      `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/ai-assistant?featureFlags=aiAssistant`,
    );
  };

  const mergeAndPublish = (): void => {
    if (result?.pullRequestNumber == null) return;
    merge.mutate(
      { pullRequestNumber: result.pullRequestNumber, branchName: result.branchName },
      {
        onSuccess: (mergeResult) => {
          if (mergeResult.isMerged) window.location.assign(publishUrl);
        },
      },
    );
  };
  const mergeFailed = merge.isError || merge.data?.isMerged === false;

  const downloadReport = result && result.steps.length > 0 && (
    <StudioBlobDownloader
      getData={() => buildMarkdownReport(org, app, result)}
      fileName={`${org}-${app}-upgrade-report.md`}
      fileType='text/markdown'
      linkText={t('app_upgrade.download_report')}
    />
  );

  const pullRequestLink = result?.pullRequestUrl && (
    <StudioLinkButton
      variant='secondary'
      href={result.pullRequestUrl}
      target='_blank'
      rel='noreferrer'
    >
      {t('app_upgrade.done.view_pull_request')}
    </StudioLinkButton>
  );

  const branchInfo = result?.branchName && (
    <StudioParagraph data-size='sm' className={classes.branchInfo}>
      {t('app_upgrade.done.branch_info', {
        branch: result.branchName,
        interpolation: { escapeValue: false },
      })}
    </StudioParagraph>
  );

  const runLink = runUrl && (
    <StudioLink href={runUrl} target='_blank' rel='noreferrer'>
      {t('app_upgrade.upgrade.view_run')}
    </StudioLink>
  );

  const details = result && (
    <>
      <UpgradeFileChanges fileChanges={result.fileChanges} />
      <FullReport result={result} />
      {runLink}
    </>
  );

  if (result?.outcome === 'Completed') {
    return (
      <>
        <StudioParagraph>{t('app_upgrade.done.completed')}</StudioParagraph>
        {branchInfo}
        {mergeFailed && (
          <StudioAlert data-color='danger'>{t('app_upgrade.done.merge_failed')}</StudioAlert>
        )}
        <Actions>
          <StudioButton
            onClick={mergeAndPublish}
            disabled={result.pullRequestNumber == null || merge.isPending}
          >
            {t(merge.isPending ? 'app_upgrade.done.merging' : 'app_upgrade.done.merge_and_publish')}
          </StudioButton>
          {pullRequestLink}
          {downloadReport}
        </Actions>
        {details}
      </>
    );
  }

  if (result?.outcome === 'ManualStepsRequired') {
    return (
      <>
        <StudioHeading level={2} data-size='xs'>
          {t('app_upgrade.done.partial_title')}
        </StudioHeading>
        <StudioParagraph>{t('app_upgrade.done.partial_description')}</StudioParagraph>
        {branchInfo}
        <Actions>
          <StudioButton onClick={goToAssistant}>
            {t('app_upgrade.done.go_to_assistant')}
          </StudioButton>
          {pullRequestLink}
          {downloadReport}
        </Actions>
        <ManualTasks manualTasks={result.manualTasks} />
        {details}
      </>
    );
  }

  return (
    <>
      <StudioHeading level={2} data-size='xs'>
        {t('app_upgrade.done.failed_title')}
      </StudioHeading>
      <StudioParagraph>{t('app_upgrade.done.failed_description')}</StudioParagraph>
      <StudioAlert data-color='danger'>
        {requestFailed ? t('app_upgrade.starting.request_failed') : result?.message}
      </StudioAlert>
      <Actions>
        <StudioButton onClick={goToAssistant}>{t('app_upgrade.done.go_to_assistant')}</StudioButton>
        {downloadReport}
        <StudioButton variant='secondary' onClick={onClose}>
          {t('app_upgrade.done.back_to_dashboard')}
        </StudioButton>
      </Actions>
      {details ?? runLink}
    </>
  );
};

const Actions = ({ children }: { children: ReactNode }): ReactElement => (
  <div className={classes.actions}>{children}</div>
);

const StatusLine = ({ icon, children }: { icon: ReactNode; children: ReactNode }): ReactElement => (
  <div className={classes.statusLine}>
    {icon}
    <StudioParagraph data-size='sm'>{children}</StudioParagraph>
  </div>
);

const CancelUpgradeButton = ({ onClick }: { onClick: () => void }): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioButton variant='tertiary' data-color='danger' icon={<TrashIcon />} onClick={onClick}>
      {t('app_upgrade.cancel')}
    </StudioButton>
  );
};

const ManualTasks = ({ manualTasks }: { manualTasks: AppUpgradeManualTask[] }): ReactElement => {
  const { t } = useTranslation();
  const groups = groupManualTasksByStep(manualTasks);
  return (
    <StudioDetails className={classes.details}>
      <StudioDetails.Summary>
        {t('app_upgrade.manual_tasks.summary', { count: manualTasks.length })}
      </StudioDetails.Summary>
      <StudioDetails.Content>
        <div className={classes.taskGroup}>
          {Object.entries(groups).map(([step, tasks]) => (
            <div key={step}>
              <StudioHeading level={3} data-size='2xs'>
                {step}
              </StudioHeading>
              <StudioList.Unordered className={classes.taskList}>
                {tasks.map((task, index) => (
                  <StudioList.Item key={`${step}-${index}`}>
                    <span className={classes.taskItem}>
                      <TaskStatusTag status={task.status} />
                      <span>{task.text}</span>
                    </span>
                  </StudioList.Item>
                ))}
              </StudioList.Unordered>
            </div>
          ))}
        </div>
      </StudioDetails.Content>
    </StudioDetails>
  );
};

const statusColors: Record<
  AppUpgradeMessageStatus,
  'warning' | 'danger' | 'info' | 'success' | 'neutral'
> = {
  Todo: 'warning',
  Warning: 'info',
  Failed: 'danger',
  Ok: 'success',
  Info: 'neutral',
  Skip: 'neutral',
};

const TaskStatusTag = ({ status }: { status: AppUpgradeMessageStatus }): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioTag data-size='sm' data-color={statusColors[status]}>
      {t(`app_upgrade.status.${status}`)}
    </StudioTag>
  );
};

const FullReport = ({ result }: { result: AppUpgradeResult }): ReactElement | null => {
  const { t } = useTranslation();
  if (result.steps.length === 0) return null;
  return (
    <StudioDetails className={classes.details}>
      <StudioDetails.Summary>{t('app_upgrade.show_full_report')}</StudioDetails.Summary>
      <StudioDetails.Content>
        {result.steps.map((step) => (
          <div key={step.name}>
            <StudioHeading level={3} data-size='2xs'>
              {step.name}
            </StudioHeading>
            <StudioList.Unordered className={classes.taskList}>
              {step.messages.map((message, index) => (
                <StudioList.Item key={`${step.name}-${index}`}>
                  {message.status}: {message.text}
                </StudioList.Item>
              ))}
            </StudioList.Unordered>
          </div>
        ))}
      </StudioDetails.Content>
    </StudioDetails>
  );
};
