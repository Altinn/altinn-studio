import { useEffect, useRef } from 'react';
import type { Ref } from 'react';

import { ConditionalWrapper } from '@app/form-component/app-components/ConditionalWrapper';
import { ConfirmPopover } from '@app/form-component/app-components/ConfirmPopover';
import { HelpText } from '@app/form-component/app-components/HelpText';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { useAlertOnChange } from '@app/form-component/layout-components/common/useAlertOnChange';
import { slugify } from '@app/form-component/layout-components/utils/slugify';
import { Checkbox } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { CheckboxProps } from '@digdir/designsystemet-react';

import classes from './CheckboxesLayout.module.css';
import type { CheckboxesOption } from './CheckboxesLayout';

type WrappedCheckboxOwnProps = {
  componentId: string;
  option: CheckboxesOption;
  hideLabel?: boolean;
  alertOnChange?: boolean;
  onCheckedChange: (checked: boolean) => void;
  ref?: Ref<HTMLInputElement>;
};

export type WrappedCheckboxProps = WrappedCheckboxOwnProps &
  Omit<CheckboxProps, 'label' | 'aria-label' | 'aria-labelledby' | keyof WrappedCheckboxOwnProps>;

export function WrappedCheckbox({
  componentId,
  option,
  hideLabel,
  alertOnChange,
  checked,
  onCheckedChange,
  readOnly,
  onChange,
  ref,
  ...rest
}: WrappedCheckboxProps) {
  const { lang, langAsString } = useTranslation();

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange } = useAlertOnChange<
    (isChecked: boolean) => void
  >(
    Boolean(alertOnChange),
    onCheckedChange,
    // Only alert when unchecking
    (isChecked) => !isChecked,
  );

  // When alertOnChange is enabled, the designsystemet Popover treats this checkbox as its trigger
  // and calls preventDefault() on every click, making the browser revert the native checked state
  // after React has already committed it. React then sees no prop change to write, so the DOM stays
  // out of sync. Re-sync it here after each commit.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current && inputRef.current.checked !== Boolean(checked)) {
        inputRef.current.checked = Boolean(checked);
      }
    });
    return () => clearTimeout(timer);
  });

  return (
    <ConditionalWrapper
      key={option.value}
      condition={Boolean(alertOnChange)}
      wrapper={(children) => (
        <ConfirmPopover
          message={langAsString('form_filler.checkbox_alert')}
          confirmText={langAsString('form_filler.alert_confirm')}
          cancelText={langAsString('general.cancel')}
          onConfirm={confirmChange}
          onCancel={cancelChange}
          open={alertOpen}
          onOpenChange={setAlertOpen}
          placement='bottom'
        >
          {children}
        </ConfirmPopover>
      )}
    >
      <Checkbox
        id={slugify(`${componentId}-${option.label}`)}
        description={option.description && lang(option.description)}
        value={option.value}
        readOnly={readOnly}
        label={
          <span className={cn({ 'sr-only': hideLabel }, classes.checkboxLabelContainer)}>
            {langAsString(option.label)}
            {option.helpText && (
              <HelpText id={componentId} title={langAsString(option.helpText)}>
                {lang(option.helpText)}
              </HelpText>
            )}
          </span>
        }
        {...rest}
        checked={checked}
        data-size='sm'
        onChange={(e) => {
          onChange?.(e);
          handleChange(e.target.checked);
        }}
        ref={mergedRef}
      />
    </ConditionalWrapper>
  );
}
