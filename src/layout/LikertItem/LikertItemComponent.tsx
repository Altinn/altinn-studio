import React from 'react';

import { TableCell, TableRow } from '@digdir/design-system-react';
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

export const LikertItemComponent = (props: PropsFromGenericComponent<'LikertItem'>) => {
  const nodeLayout = props.node.item.layout;
  const overriddenLayout = props.overrideItemProps?.layout;
  const actualLayout = overriddenLayout || nodeLayout;

  if (actualLayout === LayoutStyle.Table) {
    return <RadioGroupTableRow {...props} />;
  }

  return (
    <div className={classes.likertRadioGroupWrapperMobile}>
      <ControlledRadioGroup {...props} />
    </div>
  );
};

const RadioGroupTableRow = (props: IControlledRadioGroupProps) => {
  const { node } = props;
  const { selected, handleChange, calculatedOptions, fetchingOptions } = useRadioButtons(props);
  const validations = useUnifiedValidationsForNode(node);

  const id = node.item.id;
  const groupContainerId = node.closest((n) => n.type === 'Likert')?.item.id;
  const rowLabelId = `row-label-${id}`;

  return (
    <TableRow
      aria-labelledby={rowLabelId}
      data-componentid={node.item.id}
      data-is-loading={fetchingOptions ? 'true' : 'false'}
      className={classes.likertTableRow}
    >
      <TableCell
        scope='row'
        id={rowLabelId}
        className={classes.likertTableRowHeader}
        variant='header'
      >
        <Typography component={'div'}>
          <GenericComponentLegend />
          <ComponentValidations
            validations={validations}
            node={node}
          />
        </Typography>
      </TableCell>
      {calculatedOptions?.map((option, colIndex) => {
        const colLabelId = `${groupContainerId}-likert-columnheader-${colIndex}`;
        const isChecked = selected === option.value;
        return (
          <TableCell
            key={option.value}
            className={classes.likertTableCell}
          >
            <RadioButton
              aria-labelledby={`${rowLabelId} ${colLabelId}`}
              checked={isChecked}
              onChange={handleChange}
              value={option.value}
              name={rowLabelId}
            />
          </TableCell>
        );
      })}
    </TableRow>
  );
};
