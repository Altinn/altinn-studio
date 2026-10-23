import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioHeading,
  StudioLink,
  StudioParagraph,
  StudioSpinner,
} from '@studio/components';
import { ArrowLeftIcon } from '@studio/icons';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useAppUpgradeStatusQuery } from 'app-shared/hooks/queries/useAppUpgradeStatusQuery';
import { useAppUpgradeRunQuery } from 'app-shared/hooks/queries/useAppUpgradeRunQuery';
import { useStartAppUpgradeMutation } from 'app-shared/hooks/mutations/useStartAppUpgradeMutation';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { appUpgradeDocsUrl, studioctlUpgradeDocsUrl } from 'app-shared/ext-urls';
import type { AppUpgradeStatus } from 'app-shared/types/AppUpgrade';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { UpgradeProgress } from './UpgradeProgress';
import { UpgradeResult } from './UpgradeResult';
import { getCurrentStepIndex } from './upgradeSteps';
import classes from './AppUpgrade.module.css';

function AppUpgrade(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  return (
    <div className={classes.page}>
      <header className={classes.header}>
        <StudioLink
          href={`${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.Overview}`}
          icon={<ArrowLeftIcon />}
        >
          {t('app_upgrade.back_to_app', { app })}
        </StudioLink>
      </header>
      <main className={classes.main}>
        <StudioHeading level={1} data-size='md'>
          {t('app_upgrade.heading')}
        </StudioHeading>
        <AppUpgradeContent />
      </main>
    </div>
  );
}

export default AppUpgrade;

const AppUpgradeContent = (): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: user } = useUserQuery();
  const isOrganizationRepo = user?.login !== org;
  const status = useAppUpgradeStatusQuery(org, app, isOrganizationRepo);
  const start = useStartAppUpgradeMutation(org, app);
  const branch = start.data?.branchName ?? status.data?.activeUpgradeBranch ?? null;
  const run = useAppUpgradeRunQuery(org, app, branch);

  if (!isOrganizationRepo) {
    return <StudioAlert data-color='info'>{t('app_upgrade.organization_only')}</StudioAlert>;
  }
  if (status.isPending) {
    return <StudioSpinner aria-label={t('app_upgrade.loading')} />;
  }
  if (status.isError) {
    return <StudioAlert data-color='danger'>{t('app_upgrade.status_failed')}</StudioAlert>;
  }

  const version = status.data.targetMajorVersion;
  if (isUpgraded(status.data)) {
    return <StudioAlert data-color='success'>{t('app_upgrade.upgraded', { version })}</StudioAlert>;
  }
  if (!status.data.isAutomaticUpgradeSupported) {
    return (
      <>
        <StudioAlert data-color='info'>{t('app_upgrade.unsupported')}</StudioAlert>
        <StudioctlHint />
      </>
    );
  }

  const startUpgrade = (): void => start.mutate();
  const startFailed =
    start.isError || (start.data !== undefined && start.data.status !== 'Started');

  if (start.isPending) {
    return <UpgradeProgress version={version} currentStepIndex={0} />;
  }
  if (!branch || startFailed) {
    return <UpgradeIntro version={version} startFailed={startFailed} onStart={startUpgrade} />;
  }
  if (run.isError || run.data?.state === 'Completed') {
    return <UpgradeResult version={version} result={run.data?.result} onTryAgain={startUpgrade} />;
  }
  return <UpgradeProgress version={version} currentStepIndex={getCurrentStepIndex(run.data)} />;
};

const isUpgraded = (status: AppUpgradeStatus): boolean =>
  status.backendVersion !== null && !status.isUpgradeAvailable;

type UpgradeIntroProps = {
  version: number;
  startFailed: boolean;
  onStart: () => void;
};

const UpgradeIntro = ({ version, startFailed, onStart }: UpgradeIntroProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className={classes.section}>
      <StudioCard>
        <StudioHeading level={2} data-size='sm'>
          {t('app_upgrade.intro.title', { version })}
        </StudioHeading>
        <StudioParagraph>{t('app_upgrade.intro.description')}</StudioParagraph>
        {startFailed && (
          <StudioAlert data-color='danger'>{t('app_upgrade.start_failed')}</StudioAlert>
        )}
        <div>
          <StudioButton onClick={onStart}>{t('app_upgrade.intro.start', { version })}</StudioButton>
        </div>
      </StudioCard>
      <StudioLink href={appUpgradeDocsUrl} target='_blank' rel='noreferrer'>
        {t('app_upgrade.intro.read_more', { version })}
      </StudioLink>
      <StudioctlHint />
    </section>
  );
};

const StudioctlHint = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioParagraph data-size='sm'>
      {t('app_upgrade.studioctl')}{' '}
      <StudioLink href={studioctlUpgradeDocsUrl} target='_blank' rel='noreferrer'>
        {t('app_upgrade.studioctl_link')}
      </StudioLink>
    </StudioParagraph>
  );
};
