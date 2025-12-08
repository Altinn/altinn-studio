import { useSearchParams } from 'react-router-dom';
import { useEffectEventPolyfill } from './useEffectEventPolyfill';

export function useQueryParamState<T>(
  key: string,
  initial: T | undefined,
): [T | undefined, (value: T | undefined) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const setValue = useEffectEventPolyfill((value: T | undefined) =>
    setSearchParams(
      (params) => {
        const newParams = Object.fromEntries(params.entries());

        if (value === initial) {
          delete newParams[key];
        } else {
          try {
            newParams[key] = JSON.stringify(value);
          } catch {
            delete newParams[key];
          }
        }

        return newParams;
      },
      { replace: true },
    ),
  );

  const value = (() => {
    const raw = searchParams.get(key);
    if (raw === null) {
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initial;
    }
  })();

  return [value, setValue];
}
