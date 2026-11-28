import {
  CheckmarkCircleIcon,
  ExclamationmarkTriangleIcon,
  InformationSquareIcon,
  XMarkOctagonFillIcon,
} from '@navikt/aksel-icons';

import type { ValidationSeverity } from 'src/features/validation';

export const validationSeverityPresentation = {
  error: { Icon: XMarkOctagonFillIcon, color: 'danger' },
  warning: { Icon: ExclamationmarkTriangleIcon, color: 'warning' },
  info: { Icon: InformationSquareIcon, color: 'info' },
  success: { Icon: CheckmarkCircleIcon, color: 'success' },
} as const;

const severityOrder: ValidationSeverity[] = ['error', 'warning', 'info', 'success'];

/** The most severe of the messages, which decides the icon and color shown for all of them. */
export function getHighestSeverity(validations: { severity: ValidationSeverity }[]): ValidationSeverity | undefined {
  return severityOrder.find((severity) => validations.some((validation) => validation.severity === severity));
}
