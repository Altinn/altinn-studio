import { useRef, useState } from 'react';

import { useTimeout } from 'src/app-components/TimePicker/TimeSegment/hooks/useTimeout';
import type { TypingBufferConfig } from 'src/app-components/TimePicker/types';

export function useTypingBuffer({ onCommit, commitDelayMs, typingEndDelayMs }: TypingBufferConfig) {
  const [buffer, setBuffer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bufferRef = useRef('');

  const commitTimer = useTimeout(() => commitBufferAndClearIt(), commitDelayMs);
  const typingEndTimer = useTimeout(() => setIsTyping(false), typingEndDelayMs);

  function clearBufferCompletely() {
    setBuffer('');
    bufferRef.current = '';
  }

  function commitBufferAndClearIt() {
    const currentBuffer = bufferRef.current;
    if (currentBuffer) {
      onCommit(currentBuffer);
      clearBufferCompletely();
    }
  }

  function stopAllTimers() {
    commitTimer.clear();
    typingEndTimer.clear();
  }

  function startBothTimersAfterClearing() {
    stopAllTimers();
    commitTimer.start();
    typingEndTimer.start();
  }

  function updateBufferAndStartTyping(newBuffer: string) {
    setBuffer(newBuffer);
    bufferRef.current = newBuffer;
    setIsTyping(true);
    startBothTimersAfterClearing();
  }

  function addCharacterToBuffer(char: string) {
    const newBuffer = bufferRef.current + char;
    updateBufferAndStartTyping(newBuffer);
    return newBuffer;
  }

  function replaceBuffer(newBuffer: string) {
    updateBufferAndStartTyping(newBuffer);
  }

  function commitImmediatelyAndEndTyping() {
    commitBufferAndClearIt();
    setIsTyping(false);
    stopAllTimers();
  }

  function resetToIdleState() {
    clearBufferCompletely();
    setIsTyping(false);
    stopAllTimers();
  }

  return {
    buffer,
    isTyping,
    addCharacterToBuffer,
    replaceBuffer,
    commitImmediatelyAndEndTyping,
    resetToIdleState,
  };
}
