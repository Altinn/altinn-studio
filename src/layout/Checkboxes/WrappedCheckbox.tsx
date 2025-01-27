import React from 'react';

import { Checkbox } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { HelpText } from 'src/app-components/HelpText/HelpText';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Checkboxes/CheckboxesContainerComponent.module.css';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

interface IWrappedCheckboxProps {
  id: string;
  option: IOptionInternal;
  hideLabel?: boolean;
  alertOnChange?: boolean;
  checked: boolean;
  setChecked: (checked: boolean) => void;
}

export function WrappedCheckbox({ id, option, hideLabel, alertOnChange, checked, setChecked }: IWrappedCheckboxProps) {
  const { langAsString, elementAsString } = useLanguage();

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange } = useAlertOnChange(
    Boolean(alertOnChange),
    setChecked,
    // Only alert when unchecking
    (isChecked) => !isChecked,
  );

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
        name={option.value}
        description={option.description && <Lang id={option.description} />}
        value={option.value}
        checked={checked}
        size='small'
        onChange={(e) => handleChange(e.target.checked)}
      >
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
      </Checkbox>
    </ConditionalWrapper>
  );
}
