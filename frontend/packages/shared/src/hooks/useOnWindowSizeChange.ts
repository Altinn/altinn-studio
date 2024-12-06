import { useEffect, useState } from 'react';

type UseOnWindowSizeChangeResult = {
  windowSize: {
    width: number;
    height: number;
  };
};
export const useOnWindowSizeChange = (): UseOnWindowSizeChangeResult => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const onWindowSizeChange = (): void => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  useEffect(() => {
    window.addEventListener('resize', onWindowSizeChange);
    return () => window.removeEventListener('resize', onWindowSizeChange);
  });

  return { windowSize };
};
