import type React from 'react';

import {
  handleSegmentKeyDown,
  handleValueDecrement,
  handleValueIncrement,
} from '@app/form-component/app-components/Timepicker/utils/keyboardNavigation';
import {
  clearSegment,
  commitSegmentValue,
  handleSegmentCharacterInput,
  processSegmentBuffer,
} from '@app/form-component/app-components/Timepicker/utils/segmentTyping';
import type { SegmentInputConfig } from '@app/form-component/app-components/Timepicker/types';

export function useSegmentInputHandlers({
  segmentType,
  timeFormat,
  currentValue,
  onValueChange,
  onNavigate,
  onUpdateDisplay,
}: SegmentInputConfig) {
  function incrementCurrentValue() {
    const newValue = handleValueIncrement(currentValue, segmentType, timeFormat);
    onValueChange(newValue);
  }

  function decrementCurrentValue() {
    const newValue = handleValueDecrement(currentValue, segmentType, timeFormat);
    onValueChange(newValue);
  }

  function clearCurrentValueAndDisplay() {
    const clearedSegment = clearSegment();
    onUpdateDisplay(clearedSegment.displayValue);
    const committedValue = commitSegmentValue(segmentType, clearedSegment.actualValue);
    onValueChange(committedValue);
  }

  function fillEmptyTimeSegmentWithZero() {
    const valueIsEmpty =
      currentValue === null ||
      currentValue === '' ||
      (typeof currentValue === 'number' && isNaN(currentValue));

    if (valueIsEmpty && (segmentType === 'minutes' || segmentType === 'seconds')) {
      onValueChange(0);
    }
  }

  function processCharacterInput(character: string, currentBuffer: string) {
    const inputResult = handleSegmentCharacterInput(
      character,
      segmentType,
      currentBuffer,
      timeFormat,
    );
    const bufferResult = processSegmentBuffer(
      inputResult.newBuffer,
      segmentType,
      timeFormat.includes('a'),
    );

    onUpdateDisplay(bufferResult.displayValue);

    return {
      newBuffer: inputResult.newBuffer,
      shouldNavigateRight: inputResult.shouldNavigate || inputResult.shouldAdvance,
      shouldCommitImmediately: inputResult.shouldAdvance,
      processedValue: bufferResult.actualValue,
    };
  }

  function commitBufferValue(bufferValue: string) {
    if (segmentType === 'period') {
      onValueChange(bufferValue);
      return;
    }

    const processed = processSegmentBuffer(bufferValue, segmentType, timeFormat.includes('a'));
    if (processed.actualValue !== null) {
      const committedValue = commitSegmentValue(segmentType, processed.actualValue);
      onValueChange(committedValue);
    }
  }

  function handleArrowKeyNavigation(event: React.KeyboardEvent<HTMLInputElement>) {
    const result = handleSegmentKeyDown(event);

    if (result.shouldNavigate && result.direction) {
      onNavigate(result.direction);
      return true;
    }

    if (result.shouldIncrement) {
      incrementCurrentValue();
      return true;
    }

    if (result.shouldDecrement) {
      decrementCurrentValue();
      return true;
    }

    return false;
  }

  function handleDeleteOrBackspace() {
    clearCurrentValueAndDisplay();
  }

  function fillEmptyMinutesOrSecondsWithZero() {
    fillEmptyTimeSegmentWithZero();
  }

  return {
    processCharacterInput,
    commitBufferValue,
    handleArrowKeyNavigation,
    handleDeleteOrBackspace,
    fillEmptyMinutesOrSecondsWithZero,
  };
}
