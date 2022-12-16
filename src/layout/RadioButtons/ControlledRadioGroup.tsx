import React from 'react';
import type { ChangeEventHandler, FocusEventHandler } from 'react';

import { FormLabel } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import RadioGroup from '@material-ui/core/RadioGroup';
import cn from 'classnames';

import { AltinnSpinner } from 'src/components/shared';
import { useRadioStyles } from 'src/layout/RadioButtons/radioButtonsUtils';
import { StyledRadio } from 'src/layout/RadioButtons/StyledRadio';
import { shouldUseRowLayout } from 'src/utils/layout';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';
import type { IOption } from 'src/types';

export interface IControlledRadioGroupProps extends IRadioButtonsContainerProps {
  fetchingOptions: boolean | undefined;
  selected: string | undefined;
  handleBlur: FocusEventHandler<HTMLInputElement | HTMLButtonElement | HTMLDivElement>;
  handleChange: ChangeEventHandler<HTMLInputElement | HTMLButtonElement>;
  calculatedOptions: IOption[];
}

export const ControlledRadioGroup = ({
  id,
  layout,
  legend,
  getTextResource,
  validationMessages,
  fetchingOptions,
  selected,
  readOnly,
  handleBlur,
  handleChange,
  calculatedOptions,
}: IControlledRadioGroupProps) => {
  const classes = useRadioStyles();
  const RenderLegend = legend;
  return (
    <FormControl component='fieldset'>
      <FormLabel
        component='legend'
        classes={{ root: cn(classes.legend) }}
        id={`${id}-label`}
      >
        <RenderLegend />
      </FormLabel>
      {fetchingOptions ? (
        <AltinnSpinner />
      ) : (
        <RadioGroup
          aria-labelledby={`${id}-label`}
          name={id}
          value={selected}
          onBlur={handleBlur}
          onChange={handleChange}
          row={shouldUseRowLayout({
            layout,
            optionsCount: calculatedOptions.length,
          })}
          id={id}
        >
          {calculatedOptions.map((option: any, index: number) => (
            <React.Fragment key={index}>
              <FormControlLabel
                tabIndex={-1}
                control={<StyledRadio />}
                disabled={readOnly}
                label={getTextResource(option.label)}
                value={option.value}
                classes={{ root: cn(classes.formControl) }}
              />
              {validationMessages &&
                selected === option.value &&
                renderValidationMessagesForComponent(validationMessages.simpleBinding, id)}
            </React.Fragment>
          ))}
        </RadioGroup>
      )}
    </FormControl>
  );
};
