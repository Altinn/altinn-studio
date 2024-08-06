import { useState, useEffect } from 'react';

export const useIsSmallWidth = (width: number): boolean => {
  const [isSmallWidth, setIsSmallWidth] = useState(window.innerWidth < width);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallWidth(window.innerWidth < width);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [width]);

  return isSmallWidth;
};
