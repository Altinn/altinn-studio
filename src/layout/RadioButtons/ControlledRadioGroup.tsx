import React from 'react';
import type { ChangeEventHandler, FocusEventHandler } from 'react';

import { RadioGroup, RadioGroupVariant } from '@digdir/design-system-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { useLanguage } from 'src/hooks/useLanguage';
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
  fetchingOptions,
  selected,
  handleBlur,
  handleChangeRadioGroup,
  calculatedOptions,
  isValid,
  overrideDisplay,
}: IControlledRadioGroupProps) => {
  const { id, layout, readOnly, textResourceBindings, required, labelSettings } = node.item;
  const { lang, langAsString } = useLanguage();

  const labelText = (
    <span style={{ fontSize: '1rem', wordBreak: 'break-word' }}>
      {lang(textResourceBindings?.title)}
      <RequiredIndicator required={required} />
      <OptionalIndicator
        labelSettings={labelSettings}
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
            description={textResourceBindings?.description && lang(textResourceBindings.description)}
            value={selected}
            error={!isValid}
            fieldSetProps={{
              'aria-label': overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined,
            }}
            helpText={textResourceBindings?.help && lang(textResourceBindings.help)}
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
              label: langAsString(option.label),
              description: lang(option.description),
              helpText: option.helpText && lang(option.helpText),
            }))}
          />
        </div>
      )}
    </div>
  );
};
