import React from 'react';

import { EXPERIMENTAL_Suggestion as Suggestion, Label as DSLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { SuggestionItem } from '@digdir/designsystemet-react';

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
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
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

  const changeMessageGenerator = (values: string[]) => {
    const label = options
      .filter((o) => values.includes(o.value))
      .map((o) => langAsString(o.label))
      .join(', ');

    return lang('form_filler.dropdown_alert', [label]);
  };

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange, alertMessage } = useAlertOnChange(
    Boolean(alertOnChange),
    setData,
    (values) => values[0] !== selectedValues[0] && !!selectedValues.length,
    changeMessageGenerator,
  );

  function formatSelectedValue(selectedValues: string[], options: IOptionInternal[]): SuggestionItem | undefined {
    const selected = selectedValues.at(0);
    const option = selected !== undefined && options.find((o) => o.value === selected);
    return option ? { value: option.value, label: langAsString(option.label) } : undefined;
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
          multiple={false}
          filter={(args) => optionFilter(args, selectedLabels)}
          data-size='sm'
          selected={formatSelectedValue(selectedValues, options)}
          onSelectedChange={(option) => handleChange(option ? [option.value] : [])}
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
                onClick={() => handleChange([option.value])}
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
