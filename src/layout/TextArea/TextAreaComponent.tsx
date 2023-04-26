import React from 'react';

import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/styles/shared.css';

export type ITextAreaProps = PropsFromGenericComponent<'TextArea'>;

export function TextAreaComponent({
  node,
  formData,
  isValid,
  handleDataChange,
  overrideDisplay,
  getTextResourceAsString,
}: ITextAreaProps) {
  const { id, readOnly, textResourceBindings, saveWhileTyping, autocomplete } = node.item;
  const suppliedValue = formData?.simpleBinding;
  const { value, setValue, saveValue, onPaste } = useDelayedSavedState(
    handleDataChange,
    suppliedValue ?? '',
    saveWhileTyping,
  );

  return (
    <div className='a-form-group-items input-group p-0'>
      <textarea
        id={id}
        onBlur={() => saveValue()}
        onChange={(e) => setValue(e.target.value)}
        onPaste={() => onPaste()}
        readOnly={readOnly}
        style={{ resize: 'none' }} // This is prone to change soon, implemented inline until then. See issue #1116
        className={
          (isValid ? 'form-control a-textarea ' : 'form-control a-textarea validation-error') +
          (readOnly ? ' disabled' : '')
        }
        value={value}
        data-testid={id}
        aria-describedby={
          overrideDisplay?.renderedInTable !== true && textResourceBindings ? `description-${id}` : undefined
        }
        aria-label={
          overrideDisplay?.renderedInTable === true ? getTextResourceAsString(textResourceBindings?.title) : undefined
        }
        autoComplete={autocomplete}
      />
    </div>
  );
}
