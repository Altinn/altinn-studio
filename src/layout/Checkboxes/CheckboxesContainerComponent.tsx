import React from 'react';

import { Checkbox, HelpText } from '@digdir/design-system-react';
import cn from 'classnames';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import classes from 'src/layout/Checkboxes/CheckboxesContainerComponent.module.css';
import { WrappedCheckbox } from 'src/layout/Checkboxes/WrappedCheckbox';
import { shouldUseRowLayout } from 'src/utils/layout';
import type { PropsFromGenericComponent } from 'src/layout';

export type ICheckboxContainerProps = PropsFromGenericComponent<'Checkboxes'>;

const defaultSelectedOptions: string[] = [];

export const CheckboxContainerComponent = ({ node, isValid, overrideDisplay }: ICheckboxContainerProps) => {
  const { id, layout, readOnly, textResourceBindings, dataModelBindings, required, labelSettings, alertOnChange } =
    node.item;
  const { langAsString } = useLanguage();

  const value = FD.usePickFreshString(dataModelBindings?.simpleBinding);
  const setData = FD.useSetForBindings(dataModelBindings);
  const debounce = FD.useDebounceImmediately();

  const selected = value && value.length > 0 ? value.split(',') : defaultSelectedOptions;
  const { options: calculatedOptions, isFetching } = useGetOptions({
    ...node.item,
    node,
    metadata: {
      setValue: (metadata) => {
        setData('metadata', metadata);
      },
    },
    formData: {
      type: 'multi',
      values: selected,
      setValues: (values) => {
        setData('simpleBinding', values.join(','));
      },
    },
  });

  const labelTextGroup = (
    <span className={classes.checkBoxLabelContainer}>
      <Lang id={node.item.textResourceBindings?.title} />
      <RequiredIndicator required={required} />
      <OptionalIndicator
        labelSettings={labelSettings}
        required={required}
      />
      {textResourceBindings?.help && (
        <HelpText title={langAsString(textResourceBindings?.help)}>
          <Lang id={textResourceBindings?.help} />
        </HelpText>
      )}
    </span>
  );

  const horizontal = shouldUseRowLayout({
    layout,
    optionsCount: calculatedOptions.length,
  });
  const hideLabel = overrideDisplay?.renderedInTable === true && calculatedOptions.length === 1;
  const ariaLabel = overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined;

  return isFetching ? (
    <AltinnSpinner />
  ) : (
    <div
      id={id}
      key={`checkboxes_group_${id}`}
      onBlur={debounce}
    >
      <Checkbox.Group
        className={cn({ [classes.horizontal]: horizontal }, classes.checkboxGroup)}
        legend={labelTextGroup}
        description={<Lang id={textResourceBindings?.description} />}
        disabled={readOnly}
        hideLegend={overrideDisplay?.renderLegend === false}
        error={!isValid}
        aria-label={ariaLabel}
        value={selected}
        data-testid='checkboxes-fieldset'
      >
        {calculatedOptions.map((option) => (
          <WrappedCheckbox
            key={option.value}
            id={id}
            option={option}
            hideLabel={hideLabel}
            alertOnChange={alertOnChange}
            selected={selected}
            value={value || ''}
            setValue={(newValue) => {
              setData('simpleBinding', newValue);
            }}
          />
        ))}
      </Checkbox.Group>
    </div>
  );
};
