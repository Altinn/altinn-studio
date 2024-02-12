import React, { forwardRef } from 'react';

import { Table } from '@digdir/design-system-react';
import { Typography } from '@material-ui/core';

import { RadioButton } from 'src/components/form/RadioButton';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { LayoutStyle } from 'src/layout/common.generated';
import { GenericComponentLegend } from 'src/layout/GenericComponentUtils';
import classes from 'src/layout/LikertItem/LikertItemComponent.module.css';
import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IControlledRadioGroupProps } from 'src/layout/RadioButtons/ControlledRadioGroup';

export const LikertItemComponent = forwardRef<HTMLTableRowElement, PropsFromGenericComponent<'LikertItem'>>(
  (props, ref) => {
    const nodeLayout = props.node.item.layout;
    const overriddenLayout = props.overrideItemProps?.layout;
    const actualLayout = overriddenLayout || nodeLayout;

    if (actualLayout === LayoutStyle.Table) {
      return (
        <RadioGroupTableRow
          {...props}
          ref={ref}
        />
      );
    }

    return (
      <div className={classes.likertRadioGroupWrapperMobile}>
        <ControlledRadioGroup {...props} />
      </div>
    );
  },
);
LikertItemComponent.displayName = 'LikertItemComponent';

const RadioGroupTableRow = forwardRef<HTMLTableRowElement, IControlledRadioGroupProps>((props, ref) => {
  const { node } = props;
  const { selected, handleChange, calculatedOptions, fetchingOptions } = useRadioButtons(props);
  const validations = useUnifiedValidationsForNode(node);

  const id = node.item.id;
  const groupContainerId = node.closest((n) => n.type === 'Likert')?.item.id;
  const rowLabelId = `row-label-${id}`;

  return (
    <Table.Row
      aria-labelledby={rowLabelId}
      data-componentid={node.item.id}
      data-is-loading={fetchingOptions ? 'true' : 'false'}
      ref={ref}
    >
      <Table.Cell id={rowLabelId}>
        <Typography component={'div'}>
          <GenericComponentLegend />
          <ComponentValidations
            validations={validations}
            node={node}
          />
        </Typography>
      </Table.Cell>
      {calculatedOptions?.map((option, colIndex) => {
        const colLabelId = `${groupContainerId}-likert-columnheader-${colIndex}`;
        const isChecked = selected === option.value;
        return (
          <Table.Cell key={option.value}>
            <RadioButton
              aria-labelledby={`${rowLabelId} ${colLabelId}`}
              checked={isChecked}
              onChange={handleChange}
              value={option.value}
              name={rowLabelId}
            />
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
});
RadioGroupTableRow.displayName = 'RadioGroupTableRow';
