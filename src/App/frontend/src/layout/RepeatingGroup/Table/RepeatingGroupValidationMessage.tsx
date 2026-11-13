import React, { useId } from 'react';

import { Link, ValidationMessage } from '@digdir/designsystemet-react';

import { Lang, LangReference } from 'src/features/language/Lang';
import { useNavigateToComponent } from 'src/hooks/useNavigatePage';
import utilClasses from 'src/styles/utils.module.css';
import { DataModelLocationProviderFromNode } from 'src/utils/layout/DataModelLocation';
import type { NodeRefValidation } from 'src/features/validation';

export function RepeatingGroupValidationMessage({
  validation,
  onNavigate,
}: {
  validation: NodeRefValidation;
  onNavigate?: () => void;
}) {
  const messageId = useId();
  const navigate = useNavigateToComponent();

  return (
    <ValidationMessage
      asChild
      data-size='md'
      data-color={validation.severity === 'error' ? 'danger' : validation.severity}
    >
      <div>
        <span className={utilClasses.visuallyHidden}>
          <Lang id={`group.validation_severity_${validation.severity}`} />
        </span>
        <DataModelLocationProviderFromNode nodeId={validation.nodeId}>
          <div id={messageId}>
            <LangReference reference={validation.message} />
          </div>
        </DataModelLocationProviderFromNode>
        {onNavigate && (
          <Link
            asChild
            data-color='neutral'
          >
            <button
              type='button'
              aria-describedby={messageId}
              data-target-node={validation.nodeId}
              onClick={() => {
                onNavigate();
                void navigate(validation.nodeId, validation.baseComponentId, { error: validation }).catch(
                  () => undefined,
                );
              }}
            >
              <Lang id='group.show_in_form' />
            </button>
          </Link>
        )}
      </div>
    </ValidationMessage>
  );
}
