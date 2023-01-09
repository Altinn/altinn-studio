import { useEffect, useState } from 'react';

import type { IFormDataState } from 'src/features/form/data';

export const useDisplayData = ({ formData }: Partial<IFormDataState> | { formData: string | string[] }) => {
  const [displayData, setDisplayData] = useState<string | undefined>('');
  useEffect(() => {
    if (formData && typeof formData === 'object') {
      let displayString = '';
      Object.keys(formData).forEach((key, index) => {
        displayString += `${index > 0 ? ' ' : ''}${formData[key]}`;
      });
      setDisplayData(displayString.trim().length > 0 ? displayString : undefined);
    } else {
      setDisplayData(formData && formData.length > 0 ? formData : undefined);
    }
  }, [formData, setDisplayData]);
  return displayData;
};
