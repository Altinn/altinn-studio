import React, { useCallback } from 'react';

import { Combobox } from '@digdir/designsystemet-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useAlertOnChange } from 'src/hooks/useAlertOnChange';
import comboboxClasses from 'src/styles/combobox.module.css';
import type { PropsFromGenericComponent } from 'src/layout';

export type IMultipleSelectProps = PropsFromGenericComponent<'MultipleSelect'>;
export function MultipleSelectComponent({ node, isValid, overrideDisplay }: IMultipleSelectProps) {
  const { id, readOnly, textResourceBindings, alertOnChange } = node.item;
  const debounce = FD.useDebounceImmediately();
  const { options, isFetching, selectedValues, setData } = useGetOptions({
    ...node.item,
    valueType: 'multi',
    node,
    removeDuplicates: true,
  });
  const { langAsString, lang } = useLanguage();

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

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange, alertMessage } = useAlertOnChange(
    Boolean(alertOnChange),
    setData,
    // Only alert when removing values
    (values) => values.length < selectedValues.length,
    changeMessageGenerator,
  );

  if (isFetching) {
    return <AltinnSpinner />;
  }

  return (
    <ConditionalWrapper
      condition={Boolean(alertOnChange)}
      wrapper={(children) => (
        <DeleteWarningPopover
          deleteButtonText={langAsString('form_filler.alert_confirm')}
          messageText={alertMessage}
          onCancelClick={cancelChange}
          onPopoverDeleteClick={confirmChange}
          open={alertOpen}
          setOpen={setAlertOpen}
        >
          {children}
        </DeleteWarningPopover>
      )}
    >
      <Combobox
        multiple
        hideLabel
        id={id}
        size='sm'
        value={selectedValues}
        readOnly={readOnly}
        onValueChange={handleChange}
        onBlur={debounce}
        error={!isValid}
        clearButtonLabel={langAsString('form_filler.clear_selection')}
        aria-label={overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined}
        className={comboboxClasses.container}
      >
        <Combobox.Empty>
          <Lang id={'form_filler.no_options_found'} />
        </Combobox.Empty>
        {options.map((option) => (
          <Combobox.Option
            key={option.value}
            value={option.value}
            description={langAsString(option.description)}
            displayValue={langAsString(option.label)}
          >
            <Lang
              id={option.label}
              node={node}
            />
          </Combobox.Option>
        ))}
      </Combobox>
    </ConditionalWrapper>
  );
}
