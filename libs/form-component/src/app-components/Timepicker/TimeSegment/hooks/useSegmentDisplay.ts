import { useCallback, useEffect, useState } from 'react';

import type { SegmentType, TimeFormat } from '../../types';
import { formatSegmentValue } from '../../utils/timeFormatUtils';

export function useSegmentDisplay(
  externalValue: number | string,
  segmentType: SegmentType,
  timeFormat: TimeFormat,
) {
  const [displayValue, setDisplayValue] = useState(() =>
    formatSegmentValue(externalValue, segmentType, timeFormat),
  );

  const updateDisplayFromBuffer = useCallback((bufferValue: string) => {
    setDisplayValue(bufferValue);
  }, []);

  const syncWithExternalValue = useCallback(() => {
    const formattedValue = formatSegmentValue(externalValue, segmentType, timeFormat);
    setDisplayValue(formattedValue);
  }, [externalValue, segmentType, timeFormat]);

  useEffect(() => {
    syncWithExternalValue();
  }, [syncWithExternalValue]);

  return {
    displayValue,
    updateDisplayFromBuffer,
    syncWithExternalValue,
  };
}
