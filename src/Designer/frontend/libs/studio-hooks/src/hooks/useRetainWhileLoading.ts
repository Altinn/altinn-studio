import { usePrevious } from './usePrevious';

export const useRetainWhileLoading = <T>(isLoading: boolean, value: T) => {
  const previousValue = usePrevious(value);
  return isLoading ? previousValue : value;
};
