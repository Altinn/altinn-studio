import React, { useEffect, useRef, useState } from 'react';

import { Button, Popover } from '@digdir/designsystemet-react';
import { XMarkIcon } from '@navikt/aksel-icons';

import { ValidationMessage, validationSeverityPresentation } from 'src/components/message/ValidationMessage';
import messageClasses from 'src/components/message/ValidationMessage.module.css';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/RepeatingGroup/Table/RepeatingGroupRowValidation.module.css';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { NodeRefValidation, ValidationSeverity } from 'src/features/validation';

const severityOrder: ValidationSeverity[] = ['error', 'warning', 'info', 'success'];
export function getRowValidationSeverity(validations: NodeRefValidation[]): ValidationSeverity | undefined {
  return severityOrder.find((severity) => validations.some((validation) => validation.severity === severity));
}

export function RepeatingGroupRowValidation({
  validations,
  index,
  fieldLabel,
}: {
  validations: NodeRefValidation[];
  index: number;
  fieldLabel?: string;
}) {
  const severity = getRowValidationSeverity(validations);
  return severity ? (
    <RowValidationPopover
      validations={validations}
      index={index}
      severity={severity}
      fieldLabel={fieldLabel}
    />
  ) : null;
}

function RowValidationPopover({
  validations,
  index,
  severity,
  fieldLabel,
}: {
  validations: NodeRefValidation[];
  index: number;
  severity: ValidationSeverity;
  fieldLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { langAsString } = useLanguage();
  const getUniqueKey = useGetUniqueKeyFromObject();
  useEffect(() => {
    if (open) {
      popoverRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const { Icon, color } = validationSeverityPresentation[severity];
  const rowLabel = langAsString(`group.row_validation_${severity}`, [index + 1]);
  const label = fieldLabel ? `${fieldLabel}. ${rowLabel}` : rowLabel;
  const isFieldIndicator = fieldLabel !== undefined;

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
          data-size={isFieldIndicator ? 'sm' : undefined}
          data-testid={isFieldIndicator ? 'table-field-validation-indicator' : 'row-validation-indicator'}
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
        data-color={isFieldIndicator ? color : 'neutral'}
        variant={isFieldIndicator ? 'tinted' : undefined}
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
              className={`${messageClasses.list} ${classes.messages}`}
            >
              {validations.map((validation) => (
                <li key={getUniqueKey(validation)}>
                  <ValidationMessage
                    validation={validation}
                    onNavigate={() => setOpen(false)}
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
