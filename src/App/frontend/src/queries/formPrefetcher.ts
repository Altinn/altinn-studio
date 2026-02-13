import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { useCurrentDataModelDataElementId, useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useIsInFormContext } from 'src/features/form/FormContext';
import { useLayoutQueryDef } from 'src/features/form/layout/LayoutsContext';
import { useCurrentUiFolderNameFromUrl } from 'src/features/form/layoutSets/hooks';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useOrderDetailsQueryDef } from 'src/features/payment/OrderDetailsProvider';
import { usePaymentInformationQueryDef } from 'src/features/payment/PaymentInformationProvider';
import { useHasPayment, useIsPayment } from 'src/features/payment/utils';
import { usePdfFormatQueryDef } from 'src/features/pdf/usePdfFormatQuery';
import { useIsPdf } from 'src/hooks/useIsPdf';

/**
 * Prefetches requests happening in the FormProvider
 */
export function FormPrefetcher() {
  const uiFolder = useCurrentUiFolderNameFromUrl();
  const isPDF = useIsPdf();
  const dataTypeId = useCurrentDataModelName() ?? 'unknown';
  const instanceId = useLaxInstanceId();

  // Prefetch layouts
  usePrefetchQuery(useLayoutQueryDef(true, dataTypeId, uiFolder));

  // Prefetch payment data if applicable
  usePrefetchQuery(usePaymentInformationQueryDef(useIsPayment(), instanceId));
  usePrefetchQuery(useOrderDetailsQueryDef(useHasPayment(), instanceId));

  // Prefetch PDF format only if we are in PDF mode and loading the main form
  const dataElementId = useCurrentDataModelDataElementId();
  const isEmbedded = useIsInFormContext();
  usePrefetchQuery(usePdfFormatQueryDef(true, instanceId, dataElementId), isPDF && !isEmbedded);

  return null;
}
