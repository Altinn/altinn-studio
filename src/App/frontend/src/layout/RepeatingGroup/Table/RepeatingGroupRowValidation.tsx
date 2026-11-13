import React, { useEffect, useRef, useState } from 'react';

import { Button, Popover } from '@digdir/designsystemet-react';
import {
  CheckmarkCircleIcon,
  ExclamationmarkTriangleIcon,
  InformationSquareIcon,
  XMarkIcon,
  XMarkOctagonFillIcon,
} from '@navikt/aksel-icons';

import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/RepeatingGroup/Table/RepeatingGroupRowValidation.module.css';
import { RepeatingGroupValidationMessage } from 'src/layout/RepeatingGroup/Table/RepeatingGroupValidationMessage';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { NodeRefValidation, ValidationSeverity } from 'src/features/validation';

export const validationSeverityPresentation = {
  error: { Icon: XMarkOctagonFillIcon, color: 'danger' },
  warning: { Icon: ExclamationmarkTriangleIcon, color: 'warning' },
  info: { Icon: InformationSquareIcon, color: 'info' },
  success: { Icon: CheckmarkCircleIcon, color: 'success' },
} as const;

const severityOrder: ValidationSeverity[] = ['error', 'warning', 'info', 'success'];
export function getRowValidationSeverity(validations: NodeRefValidation[]): ValidationSeverity | undefined {
  return severityOrder.find((severity) => validations.some((validation) => validation.severity === severity));
}

export function RepeatingGroupRowValidation({
  validations,
  index,
}: {
  validations: NodeRefValidation[];
  index: number;
}) {
  const severity = getRowValidationSeverity(validations);
  return severity ? (
    <RowValidationPopover
      validations={validations}
      index={index}
      severity={severity}
    />
  ) : null;
}

function RowValidationPopover({
  validations,
  index,
  severity,
}: {
  validations: NodeRefValidation[];
  index: number;
  severity: ValidationSeverity;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { langAsString } = useLanguage();
  const getUniqueKey = useGetUniqueKeyFromObject();
  useEffect(() => {
    if (!open) {
      return;
    }
    popoverRef.current?.focus({ preventScroll: true });
    const closeOnOutsideFocus = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        !popoverRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('focusin', closeOnOutsideFocus);
    return () => document.removeEventListener('focusin', closeOnOutsideFocus);
  }, [open]);

  const { Icon, color } = validationSeverityPresentation[severity];
  const label = langAsString(`group.row_validation_${severity}`, [index + 1]);

  return (
    <Popover.TriggerContext>
      <Popover.Trigger asChild>
        <Button
          ref={triggerRef}
          variant='tertiary'
          data-color={color}
          icon
          aria-label={label}
          aria-expanded={open}
          aria-haspopup='dialog'
          onClick={() => setOpen(!open)}
          data-testid='row-validation-indicator'
        >
          <Icon aria-hidden />
        </Button>
      </Popover.Trigger>
      <Popover
        ref={popoverRef}
        tabIndex={-1}
        role='dialog'
        aria-label={langAsString('group.row_validation_messages')}
        open={open}
        onClose={() => setOpen(false)}
        placement='bottom'
        className={classes.popover}
        data-color='neutral'
        data-overscroll='contain'
        data-testid='row-validation-messages'
      >
        {open && (
          <>
            <Button
              className={classes.closeButton}
              variant='tertiary'
              data-color='neutral'
              icon
              aria-label={langAsString('general.close')}
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <XMarkIcon aria-hidden />
            </Button>
            <ul
              data-size='md'
              className={classes.messages}
            >
              {validations.map((validation) => (
                <li key={getUniqueKey(validation)}>
                  <RepeatingGroupValidationMessage
                    validation={validation}
                    onNavigate={() => {
                      triggerRef.current?.focus({ preventScroll: true });
                      setOpen(false);
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </Popover>
    </Popover.TriggerContext>
  );
}
