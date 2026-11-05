import React, { useEffect, useRef } from 'react';

import { Table } from '@digdir/designsystemet-react';

import { ValidationMessage, validationSeverityPresentation } from 'src/components/message/ValidationMessage';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { GenericComponent } from 'src/layout/GenericComponent';
import { getRowValidationSeverity } from 'src/layout/RepeatingGroup/Table/RepeatingGroupRowValidation';
import classes from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableValidation.module.css';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { NodeRefValidation } from 'src/features/validation';

export function RepeatingGroupTableField({ baseComponentId }: { baseComponentId: string }) {
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const severity = getRowValidationSeverity(validations);
  const config = useComponentConfig(baseComponentId);
  const indicatorInsideControl =
    config.type === 'Dropdown' ||
    config.type === 'TextArea' ||
    (config.type === 'Input' && !config.textResourceBindings?.suffix);
  const presentation = severity ? validationSeverityPresentation[severity] : undefined;

  return (
    <div
      className={classes.field}
      data-validation-field={baseComponentId}
      data-component-type={config.type}
      data-indicator-placement={indicatorInsideControl ? 'inside' : undefined}
    >
      <div className={classes.control}>
        <GenericComponent
          baseComponentId={baseComponentId}
          overrideDisplay={{
            renderedInTable: true,
            renderLabel: false,
            renderLegend: false,
            compactTableValidations: true,
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
    </div>
  );
}

export function RepeatingGroupTableErrors({
  validations,
  tableIds,
  columnSpan,
  index,
}: {
  validations: NodeRefValidation[];
  tableIds: string[];
  columnSpan: number;
  index: number;
}) {
  const fields = tableIds.filter((id) => validations.some((validation) => validation.baseComponentId === id));
  if (fields.length === 0) {
    return null;
  }

  return (
    <Table.Row
      className={classes.errorRow}
      data-for-row={index}
      data-testid='table-row-validation-errors'
    >
      {fields.map((id, fieldIndex) => {
        // A single field gets the full row, while simultaneous field messages get adjoining panels.
        const startColumn = fieldIndex === 0 ? 0 : tableIds.indexOf(id);
        const endColumn = fields[fieldIndex + 1] ? tableIds.indexOf(fields[fieldIndex + 1]) : columnSpan;
        return (
          <Table.Cell
            key={id}
            colSpan={endColumn - startColumn}
            className={classes.errorCell}
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
  const panelRef = useRef<HTMLUListElement>(null);
  const getUniqueKey = useGetUniqueKeyFromObject();
  const severity = getRowValidationSeverity(validations);

  useEffect(() => {
    const panel = panelRef.current;
    const row = panel?.closest('tr')?.previousElementSibling;
    const table = row?.closest('table');
    const field = Array.from(row?.querySelectorAll<HTMLElement>('[data-validation-field]') ?? []).find(
      (element) => element.dataset.validationField === baseComponentId,
    );
    if (!panel || !row || !table || !field) {
      return;
    }
    const positionArrow = () => {
      const fieldRect = field.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      panel.style.setProperty(
        '--validation-arrow-position',
        `${fieldRect.left + fieldRect.width / 2 - panelRect.left}px`,
      );
    };
    positionArrow();
    const observer = new ResizeObserver(positionArrow);
    observer.observe(table);
    observer.observe(panel);
    for (const cell of row.children) {
      observer.observe(cell);
    }
    return () => observer.disconnect();
  }, [baseComponentId]);

  return (
    <ul
      ref={panelRef}
      className={classes.messages}
      data-color={severity ? validationSeverityPresentation[severity].color : undefined}
      data-validation-for={baseComponentId}
    >
      {validations.map((validation) => (
        <li key={getUniqueKey(validation)}>
          <ValidationMessage
            validation={validation}
            showFieldLink={false}
          />
        </li>
      ))}
    </ul>
  );
}
