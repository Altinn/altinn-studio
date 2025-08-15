import React from 'react';

import { Fieldset, useCheckboxGroup } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { LabelContent } from 'src/components/label/LabelContent';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useSaveValueToGroup } from 'src/features/saveToGroup/useSaveToGroup';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import classes from 'src/layout/Checkboxes/CheckboxesContainerComponent.module.css';
import { WrappedCheckbox } from 'src/layout/Checkboxes/WrappedCheckbox';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import utilClasses from 'src/styles/utils.module.css';
import { shouldUseRowLayout } from 'src/utils/layout';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { PropsFromGenericComponent } from 'src/layout';

export const CheckboxContainerComponent = ({
  baseComponentId,
  overrideDisplay,
}: PropsFromGenericComponent<'Checkboxes'>) => {
  const item = useItemWhenType(baseComponentId, 'Checkboxes');
  const {
    id,
    layout,
    readOnly,
    textResourceBindings,
    required,
    labelSettings,
    alertOnChange,
    showLabelsInTable,
    dataModelBindings,
  } = item;
  const { langAsString } = useLanguage();
  const {
    options: calculatedOptions,
    isFetching,
    setData,
    selectedValues: selectedFromSimpleBinding,
  } = useGetOptions(baseComponentId, 'multi');
  const groupBinding = useSaveValueToGroup(dataModelBindings);
  const selectedValues = groupBinding.enabled ? groupBinding.selectedValues : selectedFromSimpleBinding;

  const isValid = useIsValid(baseComponentId);
  const horizontal = shouldUseRowLayout({
    layout,
    optionsCount: calculatedOptions.length,
  });

  const hideLabel = overrideDisplay?.renderedInTable === true && calculatedOptions.length === 1 && !showLabelsInTable;
  const ariaLabel = overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined;

  const setChecked = (isChecked: boolean, option: IOptionInternal) => {
    if (groupBinding.enabled) {
      groupBinding.toggleValue(option.value);
    } else {
      const newData = isChecked ? [...selectedValues, option.value] : selectedValues.filter((o) => o !== option.value);
      setData(newData);
    }
  };

  const { getCheckboxProps } = useCheckboxGroup({
    name: id,
    readOnly,
    value: selectedValues,
    error: !isValid,
  });

  const labelTextGroup = (
    <LabelContent
      id={useIndexedId(baseComponentId)}
      label={textResourceBindings?.title}
      readOnly={readOnly}
      required={required}
      help={textResourceBindings?.help}
      labelSettings={labelSettings}
    />
  );

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      {isFetching ? (
        <AltinnSpinner />
      ) : (
        <div
          id={id}
          key={`checkboxes_group_${id}`}
        >
          <Fieldset aria-label={ariaLabel}>
            {overrideDisplay?.renderLegend !== false && (
              <Fieldset.Legend className={classes.legend}>{labelTextGroup}</Fieldset.Legend>
            )}
            {textResourceBindings?.description && (
              <Fieldset.Description
                className={cn({ [utilClasses.visuallyHidden]: overrideDisplay?.renderLegend === false })}
              >
                <Lang id={textResourceBindings?.description} />
              </Fieldset.Description>
            )}
            <ConditionalWrapper
              condition={horizontal}
              wrapper={(children) => (
                <div
                  data-testid='horizontalWrapper'
                  className={classes.horizontal}
                >
                  {children}
                </div>
              )}
            >
              {calculatedOptions.map((option) => (
                <WrappedCheckbox
                  // Force remount to ensure checkbox reflects correct checked state
                  key={`checkbox-${option.value}-${selectedValues.includes(option.value)}`}
                  id={id}
                  option={option}
                  hideLabel={hideLabel}
                  alertOnChange={alertOnChange}
                  {...getCheckboxProps(option.value)}
                  checked={selectedValues.includes(option.value)}
                  setChecked={(isChecked) => setChecked(isChecked, option)}
                />
              ))}
            </ConditionalWrapper>
          </Fieldset>
        </div>
      )}
    </ComponentStructureWrapper>
  );
};
