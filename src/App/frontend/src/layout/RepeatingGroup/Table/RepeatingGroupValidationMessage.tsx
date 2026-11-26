import type { KeyboardEvent, MouseEvent } from 'react';

import { Link, ValidationMessage } from '@digdir/designsystemet-react';

import { Lang, LangReference } from 'src/features/language/Lang';
import { ValidationDataModelLocation } from 'src/features/validation/ValidationDataModelLocation';
import { useNavigateToComponent } from 'src/hooks/useNavigatePage';
import { validationSeverityPresentation } from 'src/layout/RepeatingGroup/Table/validationSeverity';
import utilClasses from 'src/styles/utils.module.css';
import type { NodeRefValidation } from 'src/features/validation';

export function RepeatingGroupValidationMessage({
  validation,
  onNavigate,
}: {
  validation: NodeRefValidation;
  onNavigate?: () => void;
}) {
  const navigate = useNavigateToComponent();

  function handleNavigation(event: MouseEvent | KeyboardEvent) {
    if (event.target instanceof Element && event.target.closest('a')) {
      return;
    }
    if ('key' in event && event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    onNavigate?.();
    void navigate(validation.nodeId, validation.baseComponentId, { error: validation }).catch(() => undefined);
  }

  const message = (
    <ValidationDataModelLocation validation={validation}>
      <LangReference reference={validation.message} />
    </ValidationDataModelLocation>
  );

  return (
    <ValidationMessage
      asChild
      data-size='md'
      data-color={validationSeverityPresentation[validation.severity].color}
    >
      <div>
        <span className={utilClasses.visuallyHidden}>
          <Lang id={`group.validation_severity_${validation.severity}`} />
        </span>
        {onNavigate ? (
          <Link
            asChild
            data-color='neutral'
          >
            <div
              role='link'
              tabIndex={0}
              data-target-node={validation.nodeId}
              onClick={handleNavigation}
              onKeyDown={handleNavigation}
            >
              {message}
            </div>
          </Link>
        ) : (
          message
        )}
      </div>
    </ValidationMessage>
  );
}
