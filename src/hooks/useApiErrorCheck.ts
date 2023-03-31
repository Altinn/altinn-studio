import { useAppSelector } from 'src/hooks/useAppSelector';
import { makeGetHasErrorsSelector } from 'src/selectors/getErrors';

export function useApiErrorCheck() {
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors = useAppSelector(hasErrorSelector);
  return { hasApiErrors };
}
