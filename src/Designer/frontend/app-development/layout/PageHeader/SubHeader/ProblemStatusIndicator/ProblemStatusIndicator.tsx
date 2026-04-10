import { StudioButton, StudioDialog } from '@studio/components';
import {
  CheckmarkCircleFillIcon,
  ExclamationmarkTriangleIcon,
  SectionHeaderWarningIcon,
} from '@studio/icons';
import { AppValidationDialog } from 'app-shared/components/AppValidationDialog/AppValidationDialog';
import { appHasCriticalValidationErrors } from 'app-shared/utils/appValidationUtils';
import { type AppValidationResult } from 'app-development/hooks/queries/useAppValidationQuery';

import classes from '../SubHeader.module.css';

export type ProblemStatusIndicatorProps = {
  validationResult: AppValidationResult | undefined;
  refetchValidation: () => void;
  validationPending: boolean;
};

export const ProblemStatusIndicator = ({
  validationResult,
  refetchValidation,
  validationPending,
}: ProblemStatusIndicatorProps) => {
  const revalidate = () => {
    refetchValidation();
  };

  if (validationPending) {
    return <StudioButton variant='tertiary' loading data-testid='loading-spinner'></StudioButton>;
  }
  if (validationResult?.isValid) {
    return (
      <StudioButton
        variant='tertiary'
        icon={<CheckmarkCircleFillIcon data-testid='checkmark-icon' />}
        onClick={revalidate}
      ></StudioButton>
    );
  }

  const getValidationStatus = (): ValidationSeverity => {
    const errorKeys = Object.keys(validationResult?.errors || {});
    const hasCriticalErrors = appHasCriticalValidationErrors(errorKeys);
    return hasCriticalErrors ? ValidationSeverity.ERROR : ValidationSeverity.WARNING;
  };

  const getStatusIcon = (status: ValidationSeverity) => {
    switch (status) {
      case ValidationSeverity.INFO:
        return null;
      case ValidationSeverity.WARNING:
        return <ExclamationmarkTriangleIcon data-testid='warning-icon' />;
      case ValidationSeverity.ERROR:
        return <SectionHeaderWarningIcon data-testid='error-icon' />;
    }
  };

  const members = validationResult ? Object.entries(validationResult?.errors || {}) : [];
  enum ValidationSeverity {
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
  }
  const validationSeverity = getValidationStatus();
  const icon = getStatusIcon(validationSeverity);

  const dataColor = validationSeverity === ValidationSeverity.WARNING ? 'warning' : 'danger';
  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger
        variant='tertiary'
        icon={icon}
        data-color={dataColor}
        className={classes.validationButton}
      >
        {members.length}
      </StudioDialog.Trigger>
      <AppValidationDialog />
    </StudioDialog.TriggerContext>
  );
};
