import type { ReactElement } from 'react';
import { CheckmarkIcon } from '@studio/icons';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import classes from './UpgradeStepper.module.css';

export type UpgradeStep = 'upgrade' | 'done';

const steps: UpgradeStep[] = ['upgrade', 'done'];

type UpgradeStepperProps = {
  activeStep: UpgradeStep;
};

export const UpgradeStepper = ({ activeStep }: UpgradeStepperProps): ReactElement => {
  const { t } = useTranslation();
  const activeIndex = steps.indexOf(activeStep);

  return (
    <ol className={classes.stepper} aria-label={t('app_upgrade.stepper.label')}>
      {steps.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <li
            key={step}
            className={cn(classes.step, {
              [classes.active]: isActive,
              [classes.completed]: isCompleted,
            })}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className={classes.indicator} aria-hidden>
              {isCompleted ? <CheckmarkIcon /> : index + 1}
            </span>
            <span className={classes.stepName}>{t(`app_upgrade.stepper.${step}`)}</span>
          </li>
        );
      })}
    </ol>
  );
};
