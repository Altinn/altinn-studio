import React from 'react';
import type { ChangeEventHandler, FocusEventHandler } from 'react';

import { RadioGroup, RadioGroupVariant } from '@digdir/design-system-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { shouldUseRowLayout } from 'src/utils/layout';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';
import type { IOption } from 'src/types';

export interface IControlledRadioGroupProps extends IRadioButtonsContainerProps {
  fetchingOptions: boolean | undefined;
  selected: string | undefined;
  handleBlur: FocusEventHandler<HTMLInputElement | HTMLButtonElement | HTMLDivElement>;
  handleChange: ChangeEventHandler<HTMLInputElement | HTMLButtonElement>;
  handleChangeRadioGroup: (value: string) => void;
  calculatedOptions: IOption[];
}

export const ControlledRadioGroup = ({
  node,
  getTextResource,
  fetchingOptions,
  selected,
  text,
  language,
  handleBlur,
  handleChangeRadioGroup,
  calculatedOptions,
  isValid,
  overrideDisplay,
  getTextResourceAsString,
}: IControlledRadioGroupProps) => {
  const { id, layout, readOnly, textResourceBindings, required, labelSettings } = node.item;

  const labelText = (
    <span style={{ wordBreak: 'break-word' }}>
      {text}
      <RequiredIndicator
        required={required}
        language={language}
      />
      <OptionalIndicator
        labelSettings={labelSettings}
        language={language}
        required={required}
      />
    </span>
  );

  const hideLabel = overrideDisplay?.renderedInTable === true && calculatedOptions.length === 1;

  return (
    <div>
      {fetchingOptions ? (
        <AltinnSpinner />
      ) : (
        <div
          id={id}
          onBlur={handleBlur}
        >
          <RadioGroup
            name={id}
            aria-labelledby={`${id}-label`}
            legend={overrideDisplay?.renderLegend === false ? null : labelText}
            description={textResourceBindings?.description && getTextResource(textResourceBindings.description)}
            value={selected}
            error={!isValid}
            fieldSetProps={{
              'aria-label': overrideDisplay?.renderedInTable
                ? getTextResourceAsString(textResourceBindings?.title)
                : undefined,
            }}
            helpText={textResourceBindings?.help && getTextResource(textResourceBindings.help)}
            disabled={readOnly}
            variant={
              shouldUseRowLayout({
                layout,
                optionsCount: calculatedOptions.length,
              })
                ? RadioGroupVariant.Horizontal
                : RadioGroupVariant.Vertical
            }
            onChange={handleChangeRadioGroup}
            items={calculatedOptions.map((option) => ({
              value: option.value,
              checkboxId: `${id}-${option.label.replace(/\s/g, '-')}`,
              hideLabel,
              label: hideLabel ? getTextResourceAsString(option.label) : getTextResource(option.label),
              description: getTextResource(option.description),
              helpText: option.helpText && getTextResource(option.helpText),
            }))}
          />
        </div>
      )}
    </div>
  );
};
