import React from 'react';

import { FormLabel } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import RadioGroup from '@material-ui/core/RadioGroup';
import cn from 'classnames';

import { useRadioStyles } from 'src/components/base/RadioButtons/radioButtonsUtils';
import { StyledRadio } from 'src/components/base/RadioButtons/StyledRadio';
import { shouldUseRowLayout } from 'src/utils/layout';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { IRadioButtonsContainerProps } from 'src/components/base/RadioButtons/RadioButtonsContainerComponent';
import type { IOption } from 'src/types';

import { AltinnSpinner } from 'altinn-shared/components';

export interface IControlledRadioGroupProps
  extends IRadioButtonsContainerProps {
  fetchingOptions: boolean;
  selected: string;
  handleBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
                label={getTextResource(option.label)}
                value={option.value}
                classes={{ root: cn(classes.margin) }}
              />
              {validationMessages &&
                selected === option.value &&
                renderValidationMessagesForComponent(
                  validationMessages.simpleBinding,
                  id,
                )}
            </React.Fragment>
          ))}
        </RadioGroup>
      )}
    </FormControl>
  );
};
