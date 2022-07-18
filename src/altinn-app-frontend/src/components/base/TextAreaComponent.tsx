import * as React from 'react';
import type { IComponentProps } from '..';

import '../../styles/shared.css';
import { useDelayedSavedState } from 'src/components/hooks/useDelayedSavedState';
import type { ILayoutCompTextArea } from 'src/features/form/layout';

export type ITextAreaProps = IComponentProps &
  Omit<ILayoutCompTextArea, 'type'>;

export function TextAreaComponent({
  id,
  formData,
  readOnly,
  isValid,
  handleDataChange,
  textResourceBindings,
  saveWhileTyping,
}: ITextAreaProps) {
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
          (isValid
            ? 'form-control a-textarea '
            : 'form-control a-textarea validation-error') +
          (readOnly ? ' disabled' : '')
        }
        value={value}
        data-testid={id}
        aria-describedby={
          textResourceBindings ? `description-${id}` : undefined
        }
      />
    </div>
  );
}
