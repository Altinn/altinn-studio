import { useCallback, useEffect, useState } from 'react';

import { formatSegmentValue } from '@app/form-component/app-components/Timepicker/utils/timeFormatUtils';
import type { SegmentType, TimeFormat } from '@app/form-component/app-components/Timepicker/types';

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
