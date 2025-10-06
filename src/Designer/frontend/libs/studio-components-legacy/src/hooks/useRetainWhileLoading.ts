import { usePrevious } from './usePrevious';

/**
 * @deprecated Use `useRetainWhileLoading` from studio-hooks instead.
 */
export const useRetainWhileLoading = <T>(isLoading: boolean, value: T) => {
  const previousValue = usePrevious(value);
  return isLoading ? previousValue : value;
};
