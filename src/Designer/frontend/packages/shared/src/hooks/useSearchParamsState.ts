import { useSearchParams } from 'react-router-dom';

// Inspired by https://blog.logrocket.com/use-state-url-persist-state-usesearchparams/
export function useSearchParamsState<T>(
  searchParamName: string,
  defaultValue: T,
  cast: (_: string) => T = (_: string) => _ as T,
): [searchParamsState: T, setSearchParamsState: (newState: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchParam = searchParams.get(searchParamName);
  const searchParamsState = searchParam ? cast(searchParam) : defaultValue;

  const setSearchParamsState = (newState: T) => {
    setSearchParams((prev) => {
      const { [searchParamName]: _, ...existingSearchParams } = Object.fromEntries(prev.entries());

      const newSearchParams = new URLSearchParams({
        ...existingSearchParams,
        ...(newState && { [searchParamName]: newState.toString() }),
      });

      // Sort the search params to ensure that the URL is consistent (e.g. for bookmarking)
      newSearchParams.sort();

      return newSearchParams;
    });
  };

  return [searchParamsState, setSearchParamsState];
}
