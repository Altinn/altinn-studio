import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { makeGetHasErrorsSelector } from 'src/selectors/getErrors';

export function useApiErrorCheck() {
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors = useAppSelector(hasErrorSelector);
  return { hasApiErrors };
}
