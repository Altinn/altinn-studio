import React, { forwardRef, useEffect, useState } from 'react';

import { Checkbox } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { CheckboxProps } from '@digdir/designsystemet-react';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { HelpText } from 'src/app-components/HelpText/HelpText';
import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Checkboxes/CheckboxesContainerComponent.module.css';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

type IWrappedCheckboxProps = {
  id: string;
  option: IOptionInternal;
  hideLabel?: boolean;
  alertOnChange?: boolean;
  setChecked: (checked: boolean) => void;
} & Omit<CheckboxProps, 'label' | 'aria-label' | 'aria-labelledby'>;

export const WrappedCheckbox = forwardRef<HTMLInputElement, IWrappedCheckboxProps>(function WrappedCheckbox(
  { id, option, hideLabel, alertOnChange, checked, setChecked, readOnly, ...rest }: IWrappedCheckboxProps,
  ref,
) {
  const { langAsString, elementAsString } = useLanguage();

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange } = useAlertOnChange(
    Boolean(alertOnChange),
    setChecked,
    // Only alert when unchecking
    (isChecked) => !isChecked,
  );

  // This forces a rerender when checked changes, which is blocked by designsystemet's popover.
  const [_, setRerenderState] = useState({});
  useEffect(() => {
    setRerenderState({});
  }, [checked]);

  return (
    <ConditionalWrapper
      key={option.value}
      condition={Boolean(alertOnChange)}
      wrapper={(children) => (
        <DeleteWarningPopover
          deleteButtonText={langAsString('form_filler.alert_confirm')}
          messageText={langAsString('form_filler.checkbox_alert')}
          onCancelClick={cancelChange}
          onPopoverDeleteClick={confirmChange}
          open={alertOpen}
          setOpen={setAlertOpen}
        >
          {children}
        </DeleteWarningPopover>
      )}
    >
      <Checkbox
        id={`${id}-${option.label.replace(/\s/g, '-')}`}
        description={option.description && <Lang id={option.description} />}
        value={option.value}
        readOnly={readOnly}
        label={
          <span className={cn({ 'sr-only': hideLabel }, classes.checkboxLabelContainer)}>
            {langAsString(option.label)}
            {option.helpText && (
              <HelpText
                id={id}
                title={elementAsString(option.helpText)}
              >
                <Lang id={option.helpText} />
              </HelpText>
            )}
          </span>
        }
        {...rest}
        checked={checked}
        data-size='sm'
        onChange={(e) => handleChange(e.target.checked)}
        ref={ref}
      />
    </ConditionalWrapper>
  );
});
