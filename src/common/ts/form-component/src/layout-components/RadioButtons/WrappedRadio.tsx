import { useRef } from 'react';
import type { ChangeEvent, ReactNode } from 'react';

import { ConditionalWrapper } from '@app/form-component/app-components/ConditionalWrapper';
import { DeleteWarningPopover } from '@app/form-component/app-components/DeleteWarningPopover';
import { HelpText } from '@app/form-component/app-components/HelpText';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { useAlertOnChange } from '@app/form-component/layout-components/common/useAlertOnChange';
import { Radio } from '@digdir/designsystemet-react';

import classes from './RadioButtonsLayout.module.css';
import type { RadioButtonsOption } from './RadioButtonsLayout';

interface WrappedRadioProps {
  componentId: string;
  option: RadioButtonsOption;
  checked: boolean;
  onSelect: (value: string) => void;
  readOnly?: boolean;
  isValid: boolean;
  hideLabel?: boolean;
  showAsCard?: boolean;
  alertOnChange?: boolean;
  alertMessage?: ReactNode;
}

export function WrappedRadio({
  componentId,
  option,
  checked,
  onSelect,
  readOnly,
  isValid,
  hideLabel,
  showAsCard,
  alertOnChange,
  alertMessage,
}: WrappedRadioProps) {
  const { lang, langAsString } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange } = useAlertOnChange(
    Boolean(alertOnChange),
    (event: ChangeEvent<HTMLInputElement>) => onSelect(event.target.value),
  );

  const label = langAsString(option.label);
  const radio = (
    <Radio
      label={
        <div className={`${hideLabel ? 'sr-only' : ''} ${classes.radioLabelContainer}`}>
          {label}
          {option.helpText ? (
            <HelpText title={langAsString(option.helpText)}>{lang(option.helpText)}</HelpText>
          ) : null}
        </div>
      }
      description={option.description && lang(option.description)}
      value={option.value}
      name={componentId}
      checked={checked}
      readOnly={readOnly}
      onChange={handleChange}
      className={classes.radioButton}
      data-size='sm'
      aria-invalid={!isValid}
      ref={inputRef}
    />
  );

  return (
    <ConditionalWrapper
      condition={Boolean(alertOnChange)}
      wrapper={(children) => (
        <DeleteWarningPopover
          onPopoverDeleteClick={confirmChange}
          onCancelClick={cancelChange}
          deleteButtonText={langAsString('form_filler.alert_confirm')}
          cancelButtonText={lang('general.cancel')}
          messageText={alertMessage}
          open={alertOpen}
          setOpen={setAlertOpen}
        >
          {children}
        </DeleteWarningPopover>
      )}
    >
      {showAsCard ? (
        // The card is clickable only for the visual effect. A screen reader clicks the radio inside it.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className={classes.card}
          data-testid={`test-id-${label}`}
          onClick={() => inputRef.current?.click()}
        >
          {radio}
        </div>
      ) : (
        radio
      )}
    </ConditionalWrapper>
  );
}
