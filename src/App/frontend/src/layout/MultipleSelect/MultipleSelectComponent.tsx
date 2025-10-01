import React, { useCallback } from 'react';

import { EXPERIMENTAL_Suggestion as Suggestion, Field, Label as DSLabel } from '@digdir/designsystemet-react';

import { Label } from 'src/app-components/Label/Label';
import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { getDescriptionId } from 'src/components/label/Label';
import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useSaveValueToGroup } from 'src/features/saveToGroup/useSaveToGroup';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import utilClasses from 'src/styles/utils.module.css';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { optionFilter } from 'src/utils/options';
import type { PropsFromGenericComponent } from 'src/layout';

export function MultipleSelectComponent({
  baseComponentId,
  overrideDisplay,
}: PropsFromGenericComponent<'MultipleSelect'>) {
  const item = useItemWhenType(baseComponentId, 'MultipleSelect');
  const isValid = useIsValid(baseComponentId);
  const { id, readOnly, textResourceBindings, alertOnChange, grid, required, dataModelBindings } = item;
  const {
    options,
    isFetching,
    selectedValues: selectedFromSimpleBinding,
    setData,
  } = useGetOptions(baseComponentId, 'multi');
  const groupBinding = useSaveValueToGroup(dataModelBindings);
  const selectedValues = groupBinding.enabled ? groupBinding.selectedValues : selectedFromSimpleBinding;

  const debounce = FD.useDebounceImmediately();
  const { langAsString, lang } = useLanguage();

  const selectedLabels = selectedValues.map((value) => {
    const option = options.find((o) => o.value === value);
    return option ? langAsString(option.label).toLowerCase() : value;
  });

  const { labelText, getRequiredComponent, getOptionalComponent, getHelpTextComponent, getDescriptionComponent } =
    useLabel({ baseComponentId, overrideDisplay });

  const changeMessageGenerator = useCallback(
    (values: string[]) => {
      const labelsToRemove = options
        .filter((o) => selectedValues.includes(o.value) && !values.includes(o.value))
        .map((o) => langAsString(o.label))
        .join(', ');

      return lang('form_filler.multi_select_alert', [labelsToRemove]);
    },
    [lang, langAsString, options, selectedValues],
  );

  const handleOnChange = (values: string[]) => {
    if (groupBinding.enabled) {
      groupBinding.setCheckedValues(values);
    } else {
      setData(values);
    }
  };

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange, alertMessage } = useAlertOnChange(
    Boolean(alertOnChange),
    handleOnChange,
    // Only alert when removing values
    (values) => values.length < selectedValues.length,
    changeMessageGenerator,
  );

  // return a new array of objects with value and label properties without changing the selectedValues array
  function formatSelectedValues(
    selectedValues: string[],
    options: { value: string; label: string }[],
  ): { value: string; label: string }[] {
    return selectedValues.map((value) => {
      const option = options.find((o) => o.value === value);
      return option ? { value: option.value, label: langAsString(option.label) } : { value, label: value };
    });
  }

  if (isFetching) {
    return <AltinnSpinner />;
  }

  return (
    <Field style={{ width: '100%' }}>
      <Label
        htmlFor={id}
        label={labelText}
        grid={grid?.labelGrid}
        required={required}
        requiredIndicator={getRequiredComponent()}
        optionalIndicator={getOptionalComponent()}
        help={getHelpTextComponent()}
        description={getDescriptionComponent()}
      >
        <ComponentStructureWrapper baseComponentId={baseComponentId}>
          {alertOnChange && (
            <DeleteWarningPopover
              onPopoverDeleteClick={confirmChange}
              onCancelClick={cancelChange}
              deleteButtonText={langAsString('form_filler.alert_confirm')}
              messageText={alertMessage}
              open={alertOpen}
              setOpen={setAlertOpen}
              popoverId={`${id}-alert-popover`}
            />
          )}
          {overrideDisplay?.renderedInTable && (
            // Setting aria-label on the input component does not work in DS Combobox.
            // Workaround until this issue is resolved in DS: https://github.com/digdir/designsystemet/issues/3893
            <DSLabel
              htmlFor={id}
              className={utilClasses.visuallyHidden}
            >
              <Lang id={textResourceBindings?.title} />
              {textResourceBindings?.description && <Lang id={textResourceBindings?.description} />}
            </DSLabel>
          )}
          <Suggestion
            data-testid='multiple-select-component'
            multiple
            filter={(args) => optionFilter(args, selectedLabels)}
            data-size='sm'
            selected={formatSelectedValues(selectedValues, options)}
            onSelectedChange={(options) => handleChange(options.map((o) => o.value))}
            onBlur={() => debounce}
          >
            <Suggestion.Input
              id={id}
              aria-invalid={!isValid}
              aria-label={overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined}
              aria-describedby={
                overrideDisplay?.renderedInTable !== true &&
                textResourceBindings?.title &&
                textResourceBindings?.description
                  ? getDescriptionId(id)
                  : undefined
              }
              readOnly={readOnly}
            />
            <Suggestion.Clear
              aria-label={langAsString('form_filler.clear_selection')}
              popoverTarget={`${id}-alert-popover`}
            />
            <Suggestion.List>
              <Suggestion.Empty>
                <Lang id='form_filler.no_options_found' />
              </Suggestion.Empty>
              {options.map((option) => (
                <Suggestion.Option
                  key={option.value}
                  value={option.value}
                  label={langAsString(option.label)}
                >
                  <span>
                    <wbr />
                    <Lang id={option.label} />
                    {option.description && <Lang id={option.description} />}
                  </span>
                </Suggestion.Option>
              ))}
            </Suggestion.List>
          </Suggestion>
        </ComponentStructureWrapper>
      </Label>
    </Field>
  );
}
