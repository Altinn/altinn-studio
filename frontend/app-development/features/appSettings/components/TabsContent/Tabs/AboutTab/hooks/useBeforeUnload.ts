import { useEffect, useState } from 'react';

export const useBeforeUnload = (shouldWarn: boolean) => {
  const [shouldShowWarning, setShoudShowWarning] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldWarn) {
        e.preventDefault();

        setShoudShowWarning(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldWarn]);

  return shouldShowWarning;
};
