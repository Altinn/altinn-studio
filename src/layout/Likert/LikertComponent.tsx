import React from 'react';

import { TableCell, TableRow, Typography } from '@material-ui/core';

import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import { StyledRadio } from 'src/layout/RadioButtons/StyledRadio';
import { LayoutStyle } from 'src/types';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { IControlledRadioGroupProps } from 'src/layout/RadioButtons/ControlledRadioGroup';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';

export const LikertComponent = (props: IRadioButtonsContainerProps) => {
  const { layout } = props;
  const useRadioProps = useRadioButtons(props);

  if (layout === LayoutStyle.Table) {
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
  id,
  selected,
  handleChange,
  calculatedOptions,
  handleBlur,
  componentValidations,
  legend,
}: IControlledRadioGroupProps) => {
  const node = useResolvedNode(id);
  const groupContainerId = node?.closest((n) => n.type === 'Group')?.item.id;
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
