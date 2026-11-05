import React from 'react';

import {
  CheckmarkCircleIcon,
  ExclamationmarkTriangleIcon,
  InformationSquareIcon,
  XMarkOctagonFillIcon,
} from '@navikt/aksel-icons';

import classes from 'src/components/message/ValidationMessage.module.css';
import { Lang, LangReference } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigateToComponent } from 'src/hooks/useNavigatePage';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import utilClasses from 'src/styles/utils.module.css';
import { DataModelLocationProviderFromNode, useCurrentRowContexts } from 'src/utils/layout/DataModelLocation';
import { useLabelData } from 'src/utils/layout/useLabelData';
import type { NodeRefValidation } from 'src/features/validation';

export const validationSeverityPresentation = {
  error: { Icon: XMarkOctagonFillIcon, color: 'danger' },
  warning: { Icon: ExclamationmarkTriangleIcon, color: 'warning' },
  info: { Icon: InformationSquareIcon, color: 'info' },
  success: { Icon: CheckmarkCircleIcon, color: 'success' },
} as const;

export function ValidationMessage({
  validation,
  onNavigate,
}: {
  validation: NodeRefValidation;
  onNavigate?: () => void;
}) {
  return (
    <DataModelLocationProviderFromNode
      nodeId={validation.nodeId}
      replace
    >
      <FormComponentContextProvider value={{ baseComponentId: validation.baseComponentId }}>
        <MessageContent
          validation={validation}
          onNavigate={onNavigate}
        />
      </FormComponentContextProvider>
    </DataModelLocationProviderFromNode>
  );
}

function MessageContent({ validation, onNavigate }: { validation: NodeRefValidation; onNavigate?: () => void }) {
  const { title } = useLabelData({ baseComponentId: validation.baseComponentId, overrideDisplay: undefined });
  const rowContexts = useCurrentRowContexts();
  const { langAsString } = useLanguage();
  const navigate = useNavigateToComponent();
  const { Icon, color } = validationSeverityPresentation[validation.severity];
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
          onClick={() => {
            onNavigate?.();
            void navigate(validation.nodeId, validation.baseComponentId, { error: validation });
          }}
          data-target-node={validation.nodeId}
        >
          {title ? <Lang id={title} /> : <LangReference reference={validation.message} />}
          {rowContexts.length > 1 && <span className={classes.rowPath}> ({rowPath})</span>}
        </button>
        {title && (
          <div>
            <LangReference reference={validation.message} />
          </div>
        )}
      </div>
    </div>
  );
}
