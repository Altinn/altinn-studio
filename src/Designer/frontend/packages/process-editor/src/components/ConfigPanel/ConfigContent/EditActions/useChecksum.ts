import { useState } from 'react';

type UseChecksumResult = {
  checksum: number;
  updateChecksum: () => void;
};
export const useChecksum = (): UseChecksumResult => {
  const [checksum, setChecksum] = useState<number>(0);

  const updateChecksum = (): void => {
    setChecksum((v) => v + 1);
  };

  return { checksum, updateChecksum };
};
