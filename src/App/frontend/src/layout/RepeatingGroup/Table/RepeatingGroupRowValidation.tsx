import { useEffect, useRef, useState } from 'react';

import { Button, Popover } from '@digdir/designsystemet-react';
import { XMarkIcon } from '@navikt/aksel-icons';

import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/RepeatingGroup/Table/RepeatingGroupRowValidation.module.css';
import { RepeatingGroupValidationMessage } from 'src/layout/RepeatingGroup/Table/RepeatingGroupValidationMessage';
import { useRowAriaLabel } from 'src/layout/RepeatingGroup/Table/useRowAriaLabel';
import { getHighestSeverity, validationSeverityPresentation } from 'src/layout/RepeatingGroup/Table/validationSeverity';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { NodeRefValidation, ValidationSeverity } from 'src/features/validation';

export function RepeatingGroupRowValidation({ validations }: { validations: NodeRefValidation[] }) {
  const severity = getHighestSeverity(validations);
  return severity ? (
    <RowValidationPopover
      validations={validations}
      severity={severity}
    />
  ) : null;
}

function RowValidationPopover({
  validations,
  severity,
}: {
  validations: NodeRefValidation[];
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
  const label = useRowAriaLabel(langAsString(`group.row_validation_${severity}`));

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
        onOpen={() => setOpen(true)}
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
