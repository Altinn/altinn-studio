import React from 'react';

import { Table } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { GenericComponent } from 'src/layout/GenericComponent';
import {
  getRowValidationSeverity,
  validationSeverityPresentation,
} from 'src/layout/RepeatingGroup/Table/RepeatingGroupRowValidation';
import classes from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableValidation.module.css';
import { RepeatingGroupValidationMessage } from 'src/layout/RepeatingGroup/Table/RepeatingGroupValidationMessage';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { NodeRefValidation, ValidationSeverity } from 'src/features/validation';

export function RepeatingGroupTableField({
  baseComponentId,
  panelSeverity,
}: {
  baseComponentId: string;
  panelSeverity: ValidationSeverity | undefined;
}) {
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const severity = getRowValidationSeverity(validations);
  const presentation = severity ? validationSeverityPresentation[severity] : undefined;
  const arrowPresentation = panelSeverity ? validationSeverityPresentation[panelSeverity] : presentation;

  return (
    <div
      className={classes.field}
      data-validation-field={baseComponentId}
    >
      <div className={classes.control}>
        <GenericComponent
          baseComponentId={baseComponentId}
          overrideDisplay={{
            renderedInTable: true,
            renderLabel: false,
            renderLegend: false,
          }}
          overrideItemProps={{ grid: {} }}
        />
      </div>
      {presentation && (
        <span
          className={classes.indicator}
          data-color={presentation.color}
          data-testid='table-field-validation-indicator'
          aria-hidden
        >
          <presentation.Icon />
        </span>
      )}
      {presentation && (
        <span
          className={classes.arrow}
          data-color={arrowPresentation?.color}
          data-validation-arrow
          aria-hidden
        />
      )}
    </div>
  );
}

export function RepeatingGroupTableMessages({
  validations,
  columnSpan,
  index,
  className,
}: {
  validations: NodeRefValidation[];
  columnSpan: number;
  index: number;
  className?: string;
}) {
  const getUniqueKey = useGetUniqueKeyFromObject();
  const severity = getRowValidationSeverity(validations);
  if (validations.length === 0) {
    return null;
  }

  return (
    <Table.Row
      className={cn(classes.messageRow, className)}
      data-for-row={index}
      data-testid='table-row-validation-messages'
    >
      <Table.Cell
        colSpan={columnSpan}
        className={classes.messageCell}
      >
        <ul
          className={classes.messages}
          data-color={severity ? validationSeverityPresentation[severity].color : undefined}
        >
          {validations.map((validation) => (
            <li key={getUniqueKey(validation)}>
              <RepeatingGroupValidationMessage validation={validation} />
            </li>
          ))}
        </ul>
      </Table.Cell>
    </Table.Row>
  );
}
