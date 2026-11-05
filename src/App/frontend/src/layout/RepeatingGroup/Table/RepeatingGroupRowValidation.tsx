import React, { useEffect, useRef, useState } from 'react';

import { Button, Popover } from '@digdir/designsystemet-react';
import {
  CheckmarkCircleIcon,
  ExclamationmarkTriangleIcon,
  InformationSquareIcon,
  XMarkIcon,
  XMarkOctagonFillIcon,
} from '@navikt/aksel-icons';

import { Lang, LangReference } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigateToComponent } from 'src/hooks/useNavigatePage';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import classes from 'src/layout/RepeatingGroup/Table/RepeatingGroupRowValidation.module.css';
import utilClasses from 'src/styles/utils.module.css';
import { DataModelLocationProviderFromNode, useCurrentRowContexts } from 'src/utils/layout/DataModelLocation';
import { useLabelData } from 'src/utils/layout/useLabelData';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { NodeRefValidation, ValidationSeverity } from 'src/features/validation';

const severityOrder: ValidationSeverity[] = ['error', 'warning', 'info', 'success'];
const severityPresentation = {
  error: { Icon: XMarkOctagonFillIcon, color: 'danger' },
  warning: { Icon: ExclamationmarkTriangleIcon, color: 'warning' },
  info: { Icon: InformationSquareIcon, color: 'info' },
  success: { Icon: CheckmarkCircleIcon, color: 'success' },
} as const;

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
  const navigate = useNavigateToComponent();
  useEffect(() => {
    if (open) {
      popoverRef.current?.focus();
    }
  }, [open]);

  const { Icon, color } = severityPresentation[severity];
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
            <ul className={classes.messages}>
              {validations.map((validation) => (
                <li key={getUniqueKey(validation)}>
                  <DataModelLocationProviderFromNode
                    nodeId={validation.nodeId}
                    replace
                  >
                    <FormComponentContextProvider value={{ baseComponentId: validation.baseComponentId }}>
                      <RowValidationMessage
                        validation={validation}
                        onNavigate={() => {
                          setOpen(false);
                          void navigate(validation.nodeId, validation.baseComponentId, { error: validation });
                        }}
                      />
                    </FormComponentContextProvider>
                  </DataModelLocationProviderFromNode>
                </li>
              ))}
            </ul>
          </>
        )}
      </Popover>
    </Popover.TriggerContext>
  );
}

function RowValidationMessage({ validation, onNavigate }: { validation: NodeRefValidation; onNavigate: () => void }) {
  const { title } = useLabelData({ baseComponentId: validation.baseComponentId, overrideDisplay: undefined });
  const rowContexts = useCurrentRowContexts();
  const { langAsString } = useLanguage();
  const { Icon, color } = severityPresentation[validation.severity];
  const rowPath = rowContexts.map((row) => langAsString('group.row_number', [row.rowIndex + 1])).join(' / ');

  return (
    <div className={classes.message}>
      <span
        data-color={color}
        className={classes.severityIcon}
      >
        <Icon aria-hidden />
        <span className={utilClasses.visuallyHidden}>
          <Lang id={`group.validation_severity_${validation.severity}`} />
        </span>
      </span>
      <div>
        <button
          type='button'
          className={classes.fieldLink}
          onClick={onNavigate}
          data-target-node={validation.nodeId}
        >
          <Lang id={title || 'general.select_field'} />
          {rowContexts.length > 1 && <span className={classes.rowPath}> ({rowPath})</span>}
        </button>
        <div>
          <LangReference reference={validation.message} />
        </div>
      </div>
    </div>
  );
}
