import { useEffect, useState } from 'react';
import { useOnWindowSizeChange } from './useOnWindowSizeChange';

export const useAutoSizeTextArea = (
  value: string,
  minHeightInPx: number = 40,
  maxHeightInPx: number = 100,
) => {
  const [textAreaRef, setTextAreaRef] = useState<HTMLTextAreaElement>(null);
  const { windowSize } = useOnWindowSizeChange();

  useEffect(() => {
    if (textAreaRef) {
      // Reset the height to get the correct scrollHeight for the textarea
      textAreaRef.style.height = '0px';
      textAreaRef.style.marginBottom = '10px';
      const scrollHeight = textAreaRef.scrollHeight;

      if (scrollHeight > maxHeightInPx) {
        textAreaRef.style.height = maxHeightInPx + 'px';
        textAreaRef.style.overflow = 'auto';
      } else if (scrollHeight < minHeightInPx) {
        textAreaRef.style.height = minHeightInPx + 'px';
        textAreaRef.style.overflow = 'hidden';
      } else {
        textAreaRef.style.height = scrollHeight + 'px';
        textAreaRef.style.overflow = 'hidden';
      }
    }
    // Added windowSize to the dependency array to recalculate the height of the textarea when the window size changes
  }, [textAreaRef, value, windowSize]);

  return setTextAreaRef;
};
