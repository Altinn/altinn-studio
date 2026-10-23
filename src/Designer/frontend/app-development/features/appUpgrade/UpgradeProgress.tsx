import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading, StudioParagraph, StudioSpinner } from '@studio/components';
import { CheckmarkCircleIcon } from '@studio/icons';
import { upgradeStepTextKeys } from './upgradeSteps';
import classes from './AppUpgrade.module.css';

type UpgradeProgressProps = {
  version: number;
  currentStepIndex: number;
};

export const UpgradeProgress = ({
  version,
  currentStepIndex,
}: UpgradeProgressProps): ReactElement => {
  const { t } = useTranslation();
  const stepCount = upgradeStepTextKeys.length;
  const progressLabel = t('app_upgrade.progress.step_count', {
    step: currentStepIndex + 1,
    count: stepCount,
  });

  return (
    <section className={classes.section}>
      <div>
        <StudioHeading level={2} data-size='sm'>
          {t('app_upgrade.progress.title', { version })}
        </StudioHeading>
        <StudioParagraph>{t('app_upgrade.progress.description')}</StudioParagraph>
      </div>
      <div className={classes.progress}>
        <div
          role='progressbar'
          aria-label={t('app_upgrade.progress.label')}
          aria-valuemin={0}
          aria-valuemax={stepCount}
          aria-valuenow={currentStepIndex}
          aria-valuetext={progressLabel}
          className={classes.progressTrack}
        >
          <div
            className={classes.progressBar}
            style={{ width: `${(currentStepIndex / stepCount) * 100}%` }}
          />
        </div>
        <StudioParagraph data-size='sm'>{progressLabel}</StudioParagraph>
      </div>
      <ol className={classes.steps}>
        {upgradeStepTextKeys.map((textKey, index) => (
          <li
            key={textKey}
            className={classes.step}
            aria-current={index === currentStepIndex ? 'step' : undefined}
            data-state={stepState(index, currentStepIndex)}
          >
            <StepIcon state={stepState(index, currentStepIndex)} />
            <span>{t(textKey, { version })}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};

type StepState = 'done' | 'current' | 'pending';

const stepState = (index: number, currentStepIndex: number): StepState => {
  if (index < currentStepIndex) return 'done';
  return index === currentStepIndex ? 'current' : 'pending';
};

const StepIcon = ({ state }: { state: StepState }): ReactElement => {
  const { t } = useTranslation();
  switch (state) {
    case 'done':
      return (
        <CheckmarkCircleIcon className={classes.stepIcon} title={t('app_upgrade.progress.done')} />
      );
    case 'current':
      return <StudioSpinner aria-label={t('app_upgrade.progress.in_progress')} data-size='xs' />;
    default:
      return <span className={classes.pendingIcon} aria-hidden />;
  }
};
