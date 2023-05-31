import React from 'react';

import { RadioButton } from '@digdir/design-system-react';
import { TableCell, TableRow, Typography } from '@material-ui/core';

import classes from 'src/layout/Likert/LikertComponent.module.css';
import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import { LayoutStyle } from 'src/types';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IControlledRadioGroupProps } from 'src/layout/RadioButtons/ControlledRadioGroup';

export const LikertComponent = (props: PropsFromGenericComponent<'Likert'>) => {
  const useRadioProps = useRadioButtons(props);

  const nodeLayout = props.node.item.layout;
  const overriddenLayout = props.overrideItemProps?.layout;
  const actualLayout = overriddenLayout || nodeLayout;

  if (actualLayout === LayoutStyle.Table) {
    return (
      <RadioGroupTableRow
        {...props}
        {...useRadioProps}
      />
    );
  }

  return (
    <div className={classes.likertRadioGroupWrapperMobile}>
      <ControlledRadioGroup
        {...props}
        {...useRadioProps}
      />
    </div>
  );
};

const RadioGroupTableRow = ({
  node,
  selected,
  handleChange,
  calculatedOptions,
  handleBlur,
  componentValidations,
  legend,
  isValid,
  text,
  getTextResourceAsString,
}: IControlledRadioGroupProps) => {
  const id = node.item.id;
  const groupContainerId = node.closest((n) => n.type === 'Group')?.item.id;
  const RenderLegend = legend;
  const rowLabelId = `row-label-${id}`;
  return (
    <TableRow
      aria-labelledby={rowLabelId}
      data-componentid={node.item.id}
    >
      <th
        scope='row'
        id={rowLabelId}
        className={classes.likertTableHeader}
      >
        <Typography component={'div'}>
          <RenderLegend />
          {renderValidationMessagesForComponent(componentValidations?.simpleBinding, id)}
        </Typography>
      </th>
      {calculatedOptions?.map((option, colIndex) => {
        const colLabelId = `${groupContainerId}-likert-columnheader-${colIndex}`;
        const inputId = `${id}-${colIndex}`;
        const isChecked = selected === option.value;
        return (
          <TableCell
            key={option.value}
            align={'center'}
            style={{ padding: '4px 12px' }}
            onBlur={handleBlur}
          >
            <RadioButton
              aria-labelledby={`${rowLabelId} ${colLabelId}`}
              checked={isChecked}
              onChange={handleChange}
              value={option.value}
              label={`${getPlainTextFromNode(text)} ${getTextResourceAsString(option.label)}`}
              hideLabel={true}
              name={rowLabelId}
              radioId={inputId}
              error={!isValid}
            />
          </TableCell>
        );
      })}
    </TableRow>
  );
};
