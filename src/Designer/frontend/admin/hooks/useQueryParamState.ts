import { useSearchParams } from 'react-router-dom';
import { useEffectEventPolyfill } from './useEffectEventPolyfill';

export function useQueryParamState<T extends { [key: string]: any }>(
  initial: T,
): [T, (value: Partial<T>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const setValue = useEffectEventPolyfill((value: T) =>
    setSearchParams(
      (params) => {
        const newParams = Object.fromEntries(params.entries());

        for (const [key, val] of Object.entries(value)) {
          if (val === initial[key]) {
            delete newParams[key];
          } else {
            try {
              newParams[key] = JSON.stringify(val);
            } catch {
              delete newParams[key];
            }
          }
        }

        return newParams;
      },
      { replace: true },
    ),
  );

  const value = Object.fromEntries(
    Object.keys(initial).map((key) => {
      const raw = searchParams.get(key);
      if (raw === null) {
        return [key, initial[key]];
      }
      try {
        return [key, JSON.parse(raw)];
      } catch {
        return [key, initial[key]];
      }
    }),
  );

  return [value as T, setValue];
}
