import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { useCustomValidationConfigQueryDef } from 'src/features/customValidation/CustomValidationContext';
import { useDataModelSchemaQueryDef } from 'src/features/datamodel/DataModelSchemaProvider';
import { useCurrentDataModelGuid, useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useDynamicsQueryDef } from 'src/features/form/dynamics/DynamicsContext';
import { useLayoutQueryDef, useLayoutSetId } from 'src/features/form/layout/LayoutsContext';
import { useLayoutSettingsQueryDef } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useRulesQueryDef } from 'src/features/form/rules/RulesContext';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useOrderDetailsQueryDef } from 'src/features/payment/OrderDetailsProvider';
import { usePaymentInformationQueryDef } from 'src/features/payment/PaymentInformationProvider';
import { useHasPayment, useIsPayment } from 'src/features/payment/utils';
import { usePdfFormatQueryDef } from 'src/features/pdf/usePdfFormatQuery';
import { useShouldValidateInitial } from 'src/features/validation/backendValidation/backendValidationUtils';
import { useBackendValidationQueryDef } from 'src/features/validation/backendValidation/useBackendValidation';
import { useIsPdf } from 'src/hooks/useIsPdf';

/**
 * Prefetches requests happening in the FormProvider
 */
export function FormPrefetcher() {
  const layoutSetId = useLayoutSetId();
  const dataTypeId = useCurrentDataModelName();

  usePrefetchQuery(useLayoutQueryDef(true, layoutSetId));
  usePrefetchQuery(useCustomValidationConfigQueryDef(dataTypeId));
  usePrefetchQuery(useLayoutSettingsQueryDef(layoutSetId));
  usePrefetchQuery(useDynamicsQueryDef(layoutSetId));
  usePrefetchQuery(useRulesQueryDef(layoutSetId));
  usePrefetchQuery(useDataModelSchemaQueryDef(dataTypeId));

  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const currentLanguage = useCurrentLanguage();
  const instanceId = useLaxInstance()?.instanceId;
  const dataGuid = useCurrentDataModelGuid();
  const shouldValidateInitial = useShouldValidateInitial();

  // Prefetch validations if applicable
  usePrefetchQuery(
    useBackendValidationQueryDef(true, currentLanguage, instanceId, dataGuid, currentTaskId),
    shouldValidateInitial,
  );

  // Prefetch payment data if applicable
  usePrefetchQuery(usePaymentInformationQueryDef(useIsPayment(), instanceId));
  usePrefetchQuery(useOrderDetailsQueryDef(useHasPayment(), instanceId));

  const isPDF = useIsPdf();

  // Prefetch PDF format only if we are in PDF mode
  usePrefetchQuery(usePdfFormatQueryDef(true, instanceId, dataGuid), isPDF);

  return null;
}
