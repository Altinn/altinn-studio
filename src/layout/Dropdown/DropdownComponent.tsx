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

export type IDropdownProps = PropsFromGenericComponent<'Dropdown'>;

export function DropdownComponent({ node, isValid, overrideDisplay }: IDropdownProps) {
  const { id, readOnly, textResourceBindings, alertOnChange } = node.item;
  const { langAsString, lang } = useLanguage();

  const debounce = FD.useDebounceImmediately();

  const { options, isFetching, selectedValues, setData, rawData } = useGetOptions({
    ...node.item,
    valueType: 'single',
    node,
    removeDuplicates: true,
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

  if (isFetching) {
    return <AltinnSpinner />;
  }

  return (
    <ConditionalWrapper
      condition={Boolean(alertOnChange)}
      wrapper={(children) => (
        <DeleteWarningPopover
          onPopoverDeleteClick={confirmChange}
          onCancelClick={cancelChange}
          deleteButtonText={langAsString('form_filler.alert_confirm')}
          messageText={alertMessage}
          open={alertOpen}
          setOpen={setAlertOpen}
        >
          {children}
        </DeleteWarningPopover>
      )}
    >
      <Combobox
        id={id}
        size='sm'
        hideLabel={true}
        key={rawData} // Workaround for clearing text input
        value={selectedValues}
        readOnly={readOnly}
        onValueChange={handleChange}
        onBlur={debounce}
        error={!isValid}
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
