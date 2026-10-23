import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioButton,
  StudioHeading,
  StudioLink,
  StudioList,
  StudioParagraph,
} from '@studio/components';
import type { AppUpgradeResult } from 'app-shared/types/AppUpgrade';
import { useCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCheckoutBranchMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { studioctlUpgradeDocsUrl } from 'app-shared/ext-urls';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import classes from './AppUpgrade.module.css';

type UpgradeResultProps = {
  version: number;
  result?: AppUpgradeResult;
  onTryAgain: () => void;
};

export const UpgradeResult = ({
  version,
  result,
  onTryAgain,
}: UpgradeResultProps): ReactElement => {
  const isUpgradedInBranch =
    result?.outcome === 'Completed' || result?.outcome === 'ManualStepsRequired';
  if (!result?.branchName || !isUpgradedInBranch) {
    return <UpgradeFailed message={result?.message} onTryAgain={onTryAgain} />;
  }

  return (
    <section className={classes.section}>
      {result.outcome === 'Completed' ? (
        <UpgradeCompletedAlert version={version} />
      ) : (
        <ManualTasksAlert version={version} result={result} />
      )}
      <GoToPublishButton branchName={result.branchName} />
      <HowToTest version={version} pullRequestUrl={result.pullRequestUrl} />
    </section>
  );
};

const UpgradeCompletedAlert = ({ version }: { version: number }): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioAlert data-color='success'>
      <StudioHeading level={2} data-size='xs'>
        {t('app_upgrade.done.title', { version })}
      </StudioHeading>
      <StudioParagraph>{t('app_upgrade.done.unchanged')}</StudioParagraph>
    </StudioAlert>
  );
};

type ManualTasksAlertProps = {
  version: number;
  result: AppUpgradeResult;
};

const ManualTasksAlert = ({ version, result }: ManualTasksAlertProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioAlert data-color='warning'>
      <StudioHeading level={2} data-size='xs'>
        {t('app_upgrade.done.manual_title', { version })}
      </StudioHeading>
      <StudioParagraph>{t('app_upgrade.done.manual_description')}</StudioParagraph>
      <StudioList.Unordered>
        {result.manualTasks.map((task, index) => (
          <StudioList.Item key={`${task.step}-${index}`}>
            {task.step}: {task.text}
          </StudioList.Item>
        ))}
      </StudioList.Unordered>
      <StudioParagraph>{t('app_upgrade.done.unchanged')}</StudioParagraph>
    </StudioAlert>
  );
};

const GoToPublishButton = ({ branchName }: { branchName: string }): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const navigate = useNavigate();
  const { mutate: checkoutBranch, isPending } = useCheckoutBranchMutation(org, app, {
    onSuccess: () => navigate(`/${org}/${app}/${RoutePaths.Deploy}`),
  });

  return (
    <div>
      <StudioButton onClick={() => checkoutBranch(branchName)} disabled={isPending}>
        {t('app_upgrade.done.go_to_publish')}
      </StudioButton>
    </div>
  );
};

type HowToTestProps = {
  version: number;
  pullRequestUrl: string | null;
};

const HowToTest = ({ version, pullRequestUrl }: HowToTestProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <div>
      <StudioHeading level={2} data-size='xs'>
        {t('app_upgrade.testing.title', { version })}
      </StudioHeading>
      <StudioParagraph>{t('app_upgrade.testing.description')}</StudioParagraph>
      <StudioList.Ordered>
        <StudioList.Item>{t('app_upgrade.testing.step_publish')}</StudioList.Item>
        <StudioList.Item>{t('app_upgrade.testing.step_test')}</StudioList.Item>
        <StudioList.Item>{t('app_upgrade.testing.step_merge')}</StudioList.Item>
        <StudioList.Item>{t('app_upgrade.testing.step_production', { version })}</StudioList.Item>
      </StudioList.Ordered>
      {pullRequestUrl && (
        <StudioLink href={pullRequestUrl} target='_blank' rel='noreferrer'>
          {t('app_upgrade.testing.view_changes')}
        </StudioLink>
      )}
    </div>
  );
};

type UpgradeFailedProps = {
  message?: string;
  onTryAgain: () => void;
};

const UpgradeFailed = ({ message, onTryAgain }: UpgradeFailedProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className={classes.section}>
      <StudioAlert data-color='danger'>
        <StudioHeading level={2} data-size='xs'>
          {t('app_upgrade.done.failed_title')}
        </StudioHeading>
        {message && <StudioParagraph className={classes.failureMessage}>{message}</StudioParagraph>}
        <StudioParagraph>{t('app_upgrade.done.failed_description')}</StudioParagraph>
      </StudioAlert>
      <div>
        <StudioButton onClick={onTryAgain}>{t('app_upgrade.done.try_again')}</StudioButton>
      </div>
      <StudioLink href={studioctlUpgradeDocsUrl} target='_blank' rel='noreferrer'>
        {t('app_upgrade.studioctl_link')}
      </StudioLink>
    </section>
  );
};
