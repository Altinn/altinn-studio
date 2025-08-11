import React, { useCallback } from 'react';

import { EXPERIMENTAL_Suggestion as Suggestion, Label as DSLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Label } from 'src/app-components/Label/Label';
import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { getDescriptionId } from 'src/components/label/Label';
import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Dropdown/DropdownComponent.module.css';
import comboboxClasses from 'src/styles/combobox.module.css';
import utilClasses from 'src/styles/utils.module.css';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { optionFilter } from 'src/utils/options';
import type { PropsFromGenericComponent } from 'src/layout';

export function DropdownComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Dropdown'>) {
  const item = useItemWhenType(baseComponentId, 'Dropdown');
  const isValid = useIsValid(baseComponentId);
  const { id, readOnly, textResourceBindings, alertOnChange, grid, required } = item;
  const { langAsString, lang } = useLanguage();

  const { labelText, getRequiredComponent, getOptionalComponent, getHelpTextComponent, getDescriptionComponent } =
    useLabel({ baseComponentId, overrideDisplay });

  const { options, isFetching, selectedValues, setData } = useGetOptions(baseComponentId, 'single');
  const debounce = FD.useDebounceImmediately();

  const selectedLabels = selectedValues.map((value) => {
    const option = options.find((o) => o.value === value);
    return option ? langAsString(option.label).toLowerCase() : value;
  });

  const changeMessageGenerator = useCallback(
    (values: string[]) => {
      const label = options
        .filter((o) => values.includes(o.value))
        .map((o) => langAsString(o.label))
        .join(', ');

      return lang('form_filler.dropdown_alert', [label]);
    },
    [lang, langAsString, options],
  );

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange, alertMessage } = useAlertOnChange(
    Boolean(alertOnChange),
    setData,
    (values) => values[0] !== selectedValues[0] && !!selectedValues.length,
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
            popoverId={`${id}-popover`}
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
          filter={(args) => optionFilter(args, selectedLabels)}
          data-size='sm'
          selected={formatSelectedValues(selectedValues, options)}
          onSelectedChange={(options) => handleChange(options.map((o) => o.value))}
          onBlur={() => debounce}
          name={overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined}
          className={cn(comboboxClasses.container, classes.showCaretsWithoutClear, { [classes.readOnly]: readOnly })}
          style={{ width: '100%' }}
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
                <span className={classes.optionContent}>
                  <Lang id={option.label} />
                  {option.description && <Lang id={option.description} />}
                </span>
              </Suggestion.Option>
            ))}
          </Suggestion.List>
          <span popoverTarget={`${id}-popover`} />
        </Suggestion>
      </ComponentStructureWrapper>
    </Label>
  );
}
