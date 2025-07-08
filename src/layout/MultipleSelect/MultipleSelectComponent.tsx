import React, { useCallback } from 'react';

import { EXPERIMENTAL_MultiSuggestion, Field } from '@digdir/designsystemet-react';

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
import utilclasses from 'src/styles/utils.module.css';
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

  const [componentKey, setComponentKey] = React.useState(0);

  // This is a workaround to force the component to update its internal state, when the user cancels the alert on change
  const onCancelClick = () => {
    cancelChange();
    setComponentKey((prevKey) => prevKey + 1);
  };

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
          <EXPERIMENTAL_MultiSuggestion
            key={componentKey}
            id={id}
            data-testid='multiple-select-component'
            filter={optionFilter}
            data-size='sm'
            value={selectedValues}
            onValueChange={handleChange}
            onBlur={debounce}
          >
            <EXPERIMENTAL_MultiSuggestion.Chips render={(e) => e.text} />
            {alertOnChange && (
              <DeleteWarningPopover
                deleteButtonText={langAsString('form_filler.alert_confirm')}
                messageText={alertMessage}
                onCancelClick={onCancelClick}
                onPopoverDeleteClick={confirmChange}
                open={alertOpen}
                setOpen={setAlertOpen}
              >
                <span
                  className={utilclasses.visuallyHidden}
                  aria-hidden='true'
                >
                  Trigger
                </span>
              </DeleteWarningPopover>
            )}
            <EXPERIMENTAL_MultiSuggestion.Input
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
            <EXPERIMENTAL_MultiSuggestion.Clear aria-label={langAsString('form_filler.clear_selection')} />
            <EXPERIMENTAL_MultiSuggestion.List>
              <EXPERIMENTAL_MultiSuggestion.Empty>
                <Lang id='form_filler.no_options_found' />
              </EXPERIMENTAL_MultiSuggestion.Empty>
              {options.map((option) => (
                <EXPERIMENTAL_MultiSuggestion.Option
                  key={option.value}
                  value={option.value}
                >
                  <span>
                    <wbr />
                    <Lang id={option.label} />
                    {option.description && <Lang id={option.description} />}
                  </span>
                </EXPERIMENTAL_MultiSuggestion.Option>
              ))}
            </EXPERIMENTAL_MultiSuggestion.List>
          </EXPERIMENTAL_MultiSuggestion>
        </ComponentStructureWrapper>
      </Label>
    </Field>
  );
}
