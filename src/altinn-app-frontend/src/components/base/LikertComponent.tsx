import React from 'react';
import { Box, TableCell, TableRow } from '@material-ui/core';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { useRadioButtons } from 'src/components/base/RadioButtons/radioButtonsUtils';
import { StyledRadio } from 'src/components/base/RadioButtons/StyledRadio';
import {
  ControlledRadioGroup,
  IControlledRadioGroupProps,
} from 'src/components/base/RadioButtons/ControlledRadioGroup';
import { IRadioButtonsContainerProps } from 'src/components/base/RadioButtons/RadioButtonsContainerComponent';
import { LayoutStyle } from 'src/types';


export const LikertComponent = (props: IRadioButtonsContainerProps) => {
  const { layout } = props;
  const useRadioProps = useRadioButtons(props);

  switch (layout) {
    case LayoutStyle.Table:
      return <RadioGroupTableRow {...props} {...useRadioProps} />;
    default:
      return <ControlledRadioGroup {...props} {...useRadioProps} />;
  }
};

const RadioGroupTableRow = ({
  id,
  selected,
  handleChange,
  calculatedOptions,
  handleBlur,
  groupContainerId,
  componentValidations,
  legend,
}: IControlledRadioGroupProps) => {
  const RenderLegend = legend;
  const rowLabelId = `row-label-${id}`;
  return (
    <TableRow role={'radiogroup'} aria-labelledby={rowLabelId}>
      <TableCell scope='row' id={rowLabelId} style={{ whiteSpace: 'normal' }}>
        <Box pt={1} pb={1}>
          <RenderLegend />
          {renderValidationMessagesForComponent(
            componentValidations?.simpleBinding,
            id,
          )}
        </Box>
      </TableCell>
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
