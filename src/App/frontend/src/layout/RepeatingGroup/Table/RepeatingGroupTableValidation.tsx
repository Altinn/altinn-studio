import React from 'react';

import { Table } from '@digdir/designsystemet-react';

import { ValidationMessage } from 'src/components/message/ValidationMessage';
import { useLanguage } from 'src/features/language/useLanguage';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { GenericComponent } from 'src/layout/GenericComponent';
import { RepeatingGroupRowValidation } from 'src/layout/RepeatingGroup/Table/RepeatingGroupRowValidation';
import { useTableTitle } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableTitle';
import classes from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableValidation.module.css';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { NodeRefValidation } from 'src/features/validation';

export function RepeatingGroupTableField({ baseComponentId, index }: { baseComponentId: string; index: number }) {
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const title = useTableTitle(baseComponentId);
  const config = useComponentConfig(baseComponentId);
  const indicatorInsideControl =
    config.type === 'Dropdown' ||
    config.type === 'TextArea' ||
    (config.type === 'Input' && !config.textResourceBindings?.suffix);
  const { langAsString } = useLanguage();

  return (
    <div
      className={classes.field}
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
      {validations.length > 0 && (
        <div className={classes.indicator}>
          <RepeatingGroupRowValidation
            validations={validations}
            index={index}
            fieldLabel={langAsString(title)}
          />
        </div>
      )}
    </div>
  );
}

export function RepeatingGroupTableErrors({
  validations,
  columnSpan,
  index,
}: {
  validations: NodeRefValidation[];
  columnSpan: number;
  index: number;
}) {
  const getUniqueKey = useGetUniqueKeyFromObject();
  const errors = validations.filter((validation) => validation.severity === 'error');
  if (errors.length === 0) {
    return null;
  }

  return (
    <Table.Row
      className={classes.errorRow}
      data-for-row={index}
      data-testid='table-row-validation-errors'
    >
      <Table.Cell
        colSpan={columnSpan}
        className={classes.errorCell}
      >
        <ul
          className={classes.errors}
          data-color='danger'
        >
          {errors.map((validation) => (
            <li key={getUniqueKey(validation)}>
              <ValidationMessage validation={validation} />
            </li>
          ))}
        </ul>
      </Table.Cell>
    </Table.Row>
  );
}
