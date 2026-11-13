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
import type { NodeRefValidation } from 'src/features/validation';

export function RepeatingGroupTableField({ baseComponentId }: { baseComponentId: string }) {
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const severity = getRowValidationSeverity(validations);
  const presentation = severity ? validationSeverityPresentation[severity] : undefined;

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
          data-color={presentation.color}
          data-validation-arrow
          aria-hidden
        />
      )}
    </div>
  );
}

export function RepeatingGroupTableMessages({
  validations,
  tableIds,
  columnSpan,
  index,
  className,
}: {
  validations: NodeRefValidation[];
  tableIds: string[];
  columnSpan: number;
  index: number;
  className?: string;
}) {
  const fields = tableIds.filter((id) => validations.some((validation) => validation.baseComponentId === id));
  if (fields.length === 0) {
    return null;
  }

  return (
    <Table.Row
      className={cn(classes.messageRow, className)}
      data-for-row={index}
      data-testid='table-row-validation-messages'
    >
      {fields.map((id, fieldIndex) => {
        // A single field gets the full row, while simultaneous field messages get adjoining panels.
        const startColumn = fieldIndex === 0 ? 0 : tableIds.indexOf(id);
        const endColumn = fields[fieldIndex + 1] ? tableIds.indexOf(fields[fieldIndex + 1]) : columnSpan;
        return (
          <Table.Cell
            key={id}
            colSpan={endColumn - startColumn}
            className={classes.messageCell}
          >
            <FieldMessages
              baseComponentId={id}
              validations={validations.filter((validation) => validation.baseComponentId === id)}
            />
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
}

function FieldMessages({
  baseComponentId,
  validations,
}: {
  baseComponentId: string;
  validations: NodeRefValidation[];
}) {
  const getUniqueKey = useGetUniqueKeyFromObject();
  const severity = getRowValidationSeverity(validations);

  return (
    <ul
      className={classes.messages}
      data-color={severity ? validationSeverityPresentation[severity].color : undefined}
      data-validation-for={baseComponentId}
    >
      {validations.map((validation) => (
        <li key={getUniqueKey(validation)}>
          <RepeatingGroupValidationMessage validation={validation} />
        </li>
      ))}
    </ul>
  );
}
