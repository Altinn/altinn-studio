import React from 'react';

import { TableCell, TableRow, Typography } from '@material-ui/core';

import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import { StyledRadio } from 'src/layout/RadioButtons/StyledRadio';
import { LayoutStyle } from 'src/types';
import { renderValidationMessagesForComponent } from 'src/utils/render';
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
    <ControlledRadioGroup
      {...props}
      {...useRadioProps}
    />
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
}: IControlledRadioGroupProps) => {
  const id = node.item.id;
  const groupContainerId = node.closest((n) => n.type === 'Group')?.item.id;
  const RenderLegend = legend;
  const rowLabelId = `row-label-${id}`;
  return (
    <TableRow aria-labelledby={rowLabelId}>
      <th
        scope='row'
        id={rowLabelId}
        style={{ whiteSpace: 'normal', fontWeight: 400, borderBottom: '1px solid rgb(0, 143, 214)', paddingLeft: 12 }}
      >
        <Typography component={'div'}>
          <RenderLegend />
          {renderValidationMessagesForComponent(componentValidations?.simpleBinding, id)}
        </Typography>
      </th>
      {calculatedOptions?.map((option, colIndex) => {
        // column label must reference correct id of header in table
        const colLabelId = `${groupContainerId}-likert-columnheader-${colIndex}`;
        const inputId = `input-${id}-${colIndex}`;
        const isChecked = selected === option.value;
        return (
          <TableCell key={option.value}>
            <label
              htmlFor={inputId}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <StyledRadio
                inputProps={{
                  'aria-labelledby': `${rowLabelId} ${colLabelId}`,
                  id: inputId,
                  role: 'radio',
                  name: rowLabelId,
                  'aria-checked': isChecked,
                }}
                checked={isChecked}
                onChange={handleChange}
                onBlur={handleBlur}
                value={option.value}
              />
            </label>
          </TableCell>
        );
      })}
    </TableRow>
  );
};
