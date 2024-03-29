import { useEffect, useState } from 'react';
import { useOnWindowSizeChange } from './useOnWindowSizeChange';

export const useAutoSizeTextArea = (value: string) => {
  const [textAreaRef, setTextAreaRef] = useState<HTMLTextAreaElement>(null);
  const { windowSize } = useOnWindowSizeChange();

  useEffect(() => {
    if (textAreaRef) {
      // We need to reset the height momentarily to get the correct scrollHeight for the textarea
      textAreaRef.style.height = '0px';
      const scrollHeight = textAreaRef.scrollHeight;
      textAreaRef.style.height = scrollHeight + 'px';
    }
    // Added windowSize to the dependency array to recalculate the height of the textarea when the window size changes
  }, [textAreaRef, value, windowSize]);

  return setTextAreaRef;
};
