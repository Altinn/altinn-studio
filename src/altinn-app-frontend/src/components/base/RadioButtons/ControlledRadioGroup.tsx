import React from "react";
import type { IOption } from "src/types";
import FormControl from "@material-ui/core/FormControl";
import { FormLabel } from "@material-ui/core";
import cn from "classnames";
import { AltinnSpinner } from "altinn-shared/components";
import RadioGroup from "@material-ui/core/RadioGroup";
import { shouldUseRowLayout } from "src/utils/layout";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { renderValidationMessagesForComponent } from "src/utils/render";
import type { IRadioButtonsContainerProps } from "src/components/base/RadioButtons/RadioButtonsContainerComponent";
import { useRadioStyles } from "src/components/base/RadioButtons/radioButtonsUtils";
import { StyledRadio } from "src/components/base/RadioButtons/StyledRadio";

export interface IControlledRadioGroupProps
  extends IRadioButtonsContainerProps {
  fetchingOptions: boolean;
  selected: string;
  handleBlur: () => void;
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  calculatedOptions: IOption[];
}

export const ControlledRadioGroup = ({
  id,
  layout,
  legend,
  shouldFocus,
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
    <FormControl component="fieldset">
      <FormLabel
        component="legend"
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
                control={
                  <StyledRadio
                    autoFocus={shouldFocus && selected === option.value}
                  />
                }
                label={getTextResource(option.label)}
                value={option.value}
                classes={{ root: cn(classes.margin) }}
              />
              {validationMessages &&
                selected === option.value &&
                renderValidationMessagesForComponent(
                  validationMessages.simpleBinding,
                  id
                )}
            </React.Fragment>
          ))}
        </RadioGroup>
      )}
    </FormControl>
  );
};
