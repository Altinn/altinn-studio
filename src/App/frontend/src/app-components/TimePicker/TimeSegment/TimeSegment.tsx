import React from 'react';

import { Textfield } from '@digdir/designsystemet-react';

import { useSegmentDisplay } from 'src/app-components/TimePicker/TimeSegment/hooks/useSegmentDisplay';
import { useSegmentInputHandlers } from 'src/app-components/TimePicker/TimeSegment/hooks/useSegmentInputHandlers';
import { useTypingBuffer } from 'src/app-components/TimePicker/TimeSegment/hooks/useTypingBuffer';
import type { TimeSegmentProps } from 'src/app-components/TimePicker/types';

export const TimeSegment = React.forwardRef<HTMLInputElement, TimeSegmentProps>(
  (
    {
      value,
      type,
      format,
      onValueChange,
      onNavigate,
      placeholder,
      disabled,
      readOnly,
      required,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      className,
    },
    ref,
  ) => {
    const { displayValue, updateDisplayFromBuffer, syncWithExternalValue } = useSegmentDisplay(value, type, format);

    const inputHandlers = useSegmentInputHandlers({
      segmentType: type,
      timeFormat: format,
      currentValue: value,
      onValueChange,
      onNavigate,
      onUpdateDisplay: updateDisplayFromBuffer,
    });

    const typingBuffer = useTypingBuffer({
      onCommit: inputHandlers.commitBufferValue,
      commitDelayMs: 1000,
      typingEndDelayMs: 2000,
    });

    const syncExternalChangesWhenNotTyping = () => {
      if (!typingBuffer.isTyping) {
        syncWithExternalValue();
        typingBuffer.resetToIdleState();
      }
    };

    React.useEffect(syncExternalChangesWhenNotTyping, [value, type, format, syncWithExternalValue, typingBuffer]);

    const handleCharacterTyping = (event: React.KeyboardEvent<HTMLInputElement>) => {
      const character = event.key;

      // First check if it's a special key
      const isSpecialKey =
        character === 'Delete' ||
        character === 'Backspace' ||
        character === 'ArrowLeft' ||
        character === 'ArrowRight' ||
        character === 'ArrowUp' ||
        character === 'ArrowDown';

      if (isSpecialKey) {
        handleSpecialKeys(event);
        return;
      }

      // Handle regular character input
      if (character.length === 1) {
        event.preventDefault();

        const currentBuffer = typingBuffer.buffer;
        const inputResult = inputHandlers.processCharacterInput(character, currentBuffer);

        // Use the processed buffer result, not the raw character
        typingBuffer.replaceBuffer(inputResult.newBuffer);

        if (inputResult.shouldNavigateRight) {
          typingBuffer.commitImmediatelyAndEndTyping();
          onNavigate('right');
        }
      }
    };

    const handleSpecialKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
      const isDeleteOrBackspace = event.key === 'Delete' || event.key === 'Backspace';

      if (isDeleteOrBackspace) {
        event.preventDefault();
        inputHandlers.handleDeleteOrBackspace();
        typingBuffer.resetToIdleState();
        return;
      }

      const wasArrowKeyHandled = inputHandlers.handleArrowKeyNavigation(event);
      if (wasArrowKeyHandled) {
        typingBuffer.commitImmediatelyAndEndTyping();
      }
    };

    const handleBlurEvent = () => {
      typingBuffer.commitImmediatelyAndEndTyping();
      inputHandlers.fillEmptyMinutesOrSecondsWithZero();
    };

    return (
      <Textfield
        ref={ref}
        type='text'
        value={displayValue}
        onKeyDown={handleCharacterTyping}
        onBlur={handleBlurEvent}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        className={className}
        data-size='sm'
        style={{
          width: '3rem',
          textAlign: 'center',
          padding: '0.25rem',
        }}
        autoComplete='off'
        inputMode={type === 'period' ? 'text' : 'numeric'}
        maxLength={2}
      />
    );
  },
);

TimeSegment.displayName = 'TimeSegment';
