import { useEffect, useState } from 'react';

export const useChecksum = (shouldCreateNewChecksum: boolean): number => {
  const [checksum, setChecksum] = useState<number>(0);

  useEffect(() => {
    if (shouldCreateNewChecksum) {
      setChecksum((v) => v + 1);
    }
  }, [shouldCreateNewChecksum]);

  return checksum;
};
