import React from 'react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RadioButton } from 'src/components/form/RadioButton';
import { RadioGroup } from 'src/components/form/RadioGroup';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { useLanguage } from 'src/hooks/useLanguage';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import { shouldUseRowLayout } from 'src/utils/layout';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';

export type IControlledRadioGroupProps = IRadioButtonsContainerProps;

export const ControlledRadioGroup = (props: IControlledRadioGroupProps) => {
  const { node, isValid, overrideDisplay } = props;
  const { id, layout, readOnly, textResourceBindings, required, labelSettings, showAsCard } = node.item;
  const { selected, handleChange, handleBlur, fetchingOptions, calculatedOptions } = useRadioButtons(props);
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
            legend={overrideDisplay?.renderLegend === false ? null : labelText}
            description={textResourceBindings?.description && lang(textResourceBindings.description)}
            helpText={textResourceBindings?.help && lang(textResourceBindings.help)}
            error={!isValid}
            disabled={readOnly}
            shouldDisplayHorizontally={shouldUseRowLayout({
              layout,
              optionsCount: calculatedOptions.length,
            })}
          >
            {calculatedOptions.map((option) => (
              <RadioButton
                {...option}
                label={langAsString(option.label)}
                description={lang(option.description)}
                helpText={lang(option.helpText)}
                name={id}
                key={option.value}
                checked={option.value === selected}
                showAsCard={showAsCard}
                error={!isValid}
                disabled={readOnly}
                onChange={handleChange}
                hideLabel={hideLabel}
                size='small'
              />
            ))}
          </RadioGroup>
        </div>
      )}
    </div>
  );
};
