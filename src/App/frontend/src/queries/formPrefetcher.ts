import { useMemo } from 'react';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { layoutQueryDef } from 'src/core/queries/layouts/layouts.queries';
import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { useCurrentDataModelDataElementId, useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useIsInFormContext } from 'src/features/form/FormContext';
import { useCurrentUiFolderNameFromUrl } from 'src/features/form/ui/hooks';
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
  const { fetchLayouts, fetchLayoutsForInstance } = useAppQueries();
  const fetchFns = useMemo(() => ({ fetchLayouts, fetchLayoutsForInstance }), [fetchLayouts, fetchLayoutsForInstance]);

  // Prefetch layouts
  usePrefetchQuery(layoutQueryDef(true, dataTypeId, uiFolder, instanceId, fetchFns));

  // Prefetch payment data if applicable
  usePrefetchQuery(usePaymentInformationQueryDef(useIsPayment(), instanceId));
  usePrefetchQuery(useOrderDetailsQueryDef(useHasPayment(), instanceId));

  // Prefetch PDF format only if we are in PDF mode and loading the main form
  const dataElementId = useCurrentDataModelDataElementId();
  const isEmbedded = useIsInFormContext();
  usePrefetchQuery(usePdfFormatQueryDef(true, instanceId, dataElementId), isPDF && !isEmbedded);

  return null;
}
