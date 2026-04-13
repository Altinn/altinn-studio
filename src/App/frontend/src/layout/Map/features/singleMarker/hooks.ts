import { FormStore } from 'src/features/form/FormContext';
import { parseLocation } from 'src/layout/Map/utils';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';

export function useSingleMarker(baseComponentId: string) {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'Map');
  const markerBinding = dataModelBindings.simpleBinding;
  const rawLocation = FormStore.data.useCurrentPick(markerBinding);
  return typeof rawLocation === 'string' ? parseLocation(rawLocation) : undefined;
}
