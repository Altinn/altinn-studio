import { useEffect } from 'react';

export const useOnUnmount = (callback: () => void) => useEffect(() => callback, []); // eslint-disable-line react-hooks/exhaustive-deps
