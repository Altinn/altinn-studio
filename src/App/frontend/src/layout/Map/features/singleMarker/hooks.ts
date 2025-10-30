import { FD } from 'src/features/formData/FormDataWrite';
import { parseLocation } from 'src/layout/Map/utils';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';

export function useSingleMarker(baseComponentId: string) {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'Map');
  const markerBinding = dataModelBindings.simpleBinding;
  const rawLocation = FD.useCurrentPick(markerBinding);
  return typeof rawLocation === 'string' ? parseLocation(rawLocation) : undefined;
}
