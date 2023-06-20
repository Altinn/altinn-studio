import React from 'react';

import { CheckboxGroup, CheckboxGroupVariant } from '@digdir/design-system-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useGetOptions } from 'src/hooks/useGetOptions';
import { useHasChangedIgnoreUndefined } from 'src/hooks/useHasChangedIgnoreUndefined';
import { useLanguage } from 'src/hooks/useLanguage';
import { shouldUseRowLayout } from 'src/utils/layout';
import { getOptionLookupKey } from 'src/utils/options';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IOption } from 'src/types';

export type ICheckboxContainerProps = PropsFromGenericComponent<'Checkboxes'>;

const defaultOptions: IOption[] = [];
const defaultSelectedOptions: string[] = [];

export const CheckboxContainerComponent = ({
  node,
  formData,
  isValid,
  handleDataChange,
  overrideDisplay,
}: ICheckboxContainerProps) => {
  const {
    id,
    options,
    optionsId,
    preselectedOptionIndex,
    layout,
    readOnly,
    mapping,
    source,
    textResourceBindings,
    required,
    labelSettings,
  } = node.item;
  const apiOptions = useGetOptions({ optionsId, mapping, source });
  const calculatedOptions = apiOptions || options || defaultOptions;
  const hasSelectedInitial = React.useRef(false);
  const optionsHasChanged = useHasChangedIgnoreUndefined(apiOptions);
  const lookupKey = optionsId && getOptionLookupKey({ id: optionsId, mapping });
  const fetchingOptions = useAppSelector((state) => lookupKey && state.optionState.options[lookupKey]?.loading);
  const { lang, langAsString } = useLanguage();

  const { value, setValue, saveValue } = useDelayedSavedState(handleDataChange, formData?.simpleBinding ?? '', 200);

  const selected = value && value.length > 0 ? value.split(',') : defaultSelectedOptions;

  React.useEffect(() => {
    const shouldSelectOptionAutomatically =
      !formData?.simpleBinding &&
      typeof preselectedOptionIndex !== 'undefined' &&
      preselectedOptionIndex >= 0 &&
      calculatedOptions &&
      preselectedOptionIndex < calculatedOptions.length &&
      hasSelectedInitial.current === false;

    if (shouldSelectOptionAutomatically) {
      setValue(calculatedOptions[preselectedOptionIndex].value, true);
      hasSelectedInitial.current = true;
    }
  }, [formData?.simpleBinding, calculatedOptions, setValue, preselectedOptionIndex]);

  React.useEffect(() => {
    if (optionsHasChanged && formData.simpleBinding) {
      // New options have been loaded, we have to reset form data.
      setValue(undefined, true);
    }
  }, [setValue, optionsHasChanged, formData]);

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

  return fetchingOptions ? (
    <AltinnSpinner />
  ) : (
    <div
      id={id}
      key={`checkboxes_group_${id}`}
      onBlur={handleBlur}
    >
      <CheckboxGroup
        compact={false}
        disabled={readOnly}
        onChange={(values) => handleChange(values)}
        legend={overrideDisplay?.renderLegend === false ? null : labelText}
        description={textResourceBindings?.description && langAsString(textResourceBindings.description)}
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
            ? CheckboxGroupVariant.Horizontal
            : CheckboxGroupVariant.Vertical
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
