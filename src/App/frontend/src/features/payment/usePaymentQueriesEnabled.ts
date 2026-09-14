import { FormStore } from 'src/features/form/FormContext';
import { useIsPdf } from 'src/hooks/useIsPdf';

/** PDF rendering only needs payment data when the rendered layouts contain payment components. */
export function usePaymentQueriesEnabled(): boolean {
  const isPdf = useIsPdf();
  const hasPaymentComponents = FormStore.raw.useSelector((state) =>
    Object.values(state.bootstrap.layoutLookups.allComponents).some(
      (component) => component?.type === 'Payment' || component?.type === 'PaymentDetails',
    ),
  );
  return !isPdf || hasPaymentComponents;
}
