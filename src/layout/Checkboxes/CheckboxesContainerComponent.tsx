import React from 'react';

import { LegacyCheckboxGroup } from '@digdir/design-system-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useLanguage } from 'src/hooks/useLanguage';
import { shouldUseRowLayout } from 'src/utils/layout';
import type { PropsFromGenericComponent } from 'src/layout';

export type ICheckboxContainerProps = PropsFromGenericComponent<'Checkboxes'>;

const defaultSelectedOptions: string[] = [];

export const CheckboxContainerComponent = ({
  node,
  formData,
  isValid,
  handleDataChange,
  overrideDisplay,
}: ICheckboxContainerProps) => {
  const { id, layout, readOnly, textResourceBindings, required, labelSettings } = node.item;
  const { lang, langAsString } = useLanguage();
  const {
    value: _value,
    setValue,
    saveValue,
  } = useDelayedSavedState(handleDataChange, formData?.simpleBinding ?? '', 200);

  const value = _value ?? formData?.simpleBinding ?? '';
  const selected = value && value.length > 0 ? value.split(',') : defaultSelectedOptions;
  const { options: calculatedOptions, isFetching } = useGetOptions({
    ...node.item,
    node,
    formData: {
      type: 'multi',
      values: selected,
      setValues: (values) => {
        setValue(values.join(','));
      },
    },
  });

  const handleChange = (checkedItems: string[]) => {
    const checkedItemsString = checkedItems.join(',');
    if (checkedItemsString !== value) {
      setValue(checkedItems.join(','));
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    // Only set value instantly if moving focus outside of the checkbox group
    if (!event.currentTarget.contains(event.relatedTarget)) {
      saveValue();
    }
  };

  const labelText = (
    <span style={{ fontSize: '1rem' }}>
      {lang(node.item.textResourceBindings?.title)}
      <RequiredIndicator required={required} />
      <OptionalIndicator
        labelSettings={labelSettings}
        required={required}
      />
    </span>
  );

  const hideLabel = overrideDisplay?.renderedInTable === true && calculatedOptions.length === 1;

  return isFetching ? (
    <AltinnSpinner />
  ) : (
    <div
      id={id}
      key={`checkboxes_group_${id}`}
      onBlur={handleBlur}
    >
      <LegacyCheckboxGroup
        compact={false}
        disabled={readOnly}
        onChange={(values) => handleChange(values)}
        legend={overrideDisplay?.renderLegend === false ? null : labelText}
        description={textResourceBindings?.description && lang(textResourceBindings.description)}
        error={!isValid}
        fieldSetProps={{
          'aria-label': overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined,
        }}
        helpText={textResourceBindings?.help && lang(textResourceBindings.help)}
        variant={
          shouldUseRowLayout({
            layout,
            optionsCount: calculatedOptions.length,
          })
            ? 'horizontal'
            : 'vertical'
        }
        items={calculatedOptions.map((option) => ({
          name: option.value,
          checkboxId: `${id}-${option.label.replace(/\s/g, '-')}`,
          checked: selected.includes(option.value),
          hideLabel,
          label: langAsString(option.label),
          description: langAsString(option.description),
          helpText: option.helpText && langAsString(option.helpText),
        }))}
      />
    </div>
  );
};
