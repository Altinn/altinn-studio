import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { useCurrentDataModelDataElementId, useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useDynamicsQueryDef } from 'src/features/form/dynamics/DynamicsContext';
import { useLayoutQueryDef, useLayoutSetId } from 'src/features/form/layout/LayoutsContext';
import { useLayoutSettingsQueryDef } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useRulesQueryDef } from 'src/features/form/rules/RulesContext';
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
  const layoutSetId = useLayoutSetId();
  const isPDF = useIsPdf();
  const dataTypeId = useCurrentDataModelName() ?? 'unknown';
  const instanceId = useLaxInstanceId();

  // Prefetch layouts
  usePrefetchQuery(useLayoutQueryDef(true, dataTypeId, layoutSetId));

  const dataElementId = useCurrentDataModelDataElementId();

  // Prefetch other layout related files
  usePrefetchQuery(useLayoutSettingsQueryDef(layoutSetId));
  usePrefetchQuery(useDynamicsQueryDef(layoutSetId));
  usePrefetchQuery(useRulesQueryDef(layoutSetId));

  // Prefetch payment data if applicable
  usePrefetchQuery(usePaymentInformationQueryDef(useIsPayment(), instanceId));
  usePrefetchQuery(useOrderDetailsQueryDef(useHasPayment(), instanceId));

  // Prefetch PDF format only if we are in PDF mode
  usePrefetchQuery(usePdfFormatQueryDef(true, instanceId, dataElementId), isPDF);

  return null;
}
