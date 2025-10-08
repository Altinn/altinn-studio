import { usePrevious } from '../../../studio-hooks/src/hooks/usePrevious';

export const useRetainWhileLoading = <T>(isLoading: boolean, value: T): T => {
  const previousValue = usePrevious(value);
  return isLoading ? (previousValue ?? value) : value;
};
