import React, { forwardRef } from 'react';

import { Radio, Table } from '@digdir/designsystemet-react';

import { Label } from 'src/components/label/Label';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { LayoutStyle } from 'src/layout/common.generated';
import classes from 'src/layout/LikertItem/LikertItemComponent.module.css';
import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IControlledRadioGroupProps } from 'src/layout/RadioButtons/ControlledRadioGroup';

export const LikertItemComponent = forwardRef<HTMLTableRowElement, PropsFromGenericComponent<'LikertItem'>>(
  (props, ref) => {
    const item = useNodeItem(props.node);
    const overriddenLayout = props.overrideItemProps?.layout;
    const layout = overriddenLayout ?? item.layout;

    if (layout === LayoutStyle.Table) {
      return (
        <RadioGroupTableRow
          {...props}
          ref={ref}
        />
      );
    }

    return <ControlledRadioGroup {...props} />;
  },
);
LikertItemComponent.displayName = 'LikertItemComponent';

const RadioGroupTableRow = forwardRef<HTMLTableRowElement, IControlledRadioGroupProps>((props, ref) => {
  const { node } = props;
  const { langAsString } = useLanguage();
  const { selectedValues, handleChange, calculatedOptions, fetchingOptions } = useRadioButtons(props);
  const validations = useUnifiedValidationsForNode(node);

  const { id, readOnly } = useNodeItem(node);
  const groupContainer =
    node.parent instanceof BaseLayoutNode && node.parent.isType('Likert') ? node.parent : undefined;
  const groupContainerId = groupContainer?.id;

  const headerColumnId = `${groupContainerId}-likert-columnheader-left`;
  const rowLabelId = `row-label-${id}`;

  return (
    <Table.Row
      aria-labelledby={`${headerColumnId} ${rowLabelId}`}
      data-componentid={node.id}
      data-is-loading={fetchingOptions ? 'true' : 'false'}
      role='radiogroup'
      ref={ref}
    >
      <Table.Cell id={rowLabelId}>
        <Label
          node={node}
          renderLabelAs='legend'
          weight='regular'
          size='small'
        >
          <ComponentValidations validations={validations} />
        </Label>
      </Table.Cell>
      {calculatedOptions?.map((option) => {
        const isChecked = selectedValues[0] === option.value;
        return (
          <Table.Cell key={option.value}>
            <Radio
              checked={isChecked}
              readOnly={readOnly}
              onChange={handleChange}
              value={option.value}
              className={classes.likertRadioButton}
              name={rowLabelId}
              aria-label={langAsString(option.label)}
            />
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
});

RadioGroupTableRow.displayName = 'RadioGroupTableRow';
