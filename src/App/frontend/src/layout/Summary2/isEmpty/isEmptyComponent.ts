import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';

function useHasDataInBindings(baseComponentId: string) {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId);
  const formData = FormStore.data.useFreshBindings(dataModelBindings, 'raw');

  // Checks if there is data in any of the data model binding
  return Object.values(formData).some((value) => value !== undefined && value !== null && value !== '');
}

export function useHasNoDataInBindings(baseComponentId: string) {
  return !useHasDataInBindings(baseComponentId);
}

export function useHasBindingsAndNoData(baseComponentId: string) {
  const hasBindings = !!useDataModelBindingsFor(baseComponentId);
  return useHasNoDataInBindings(baseComponentId) && hasBindings;
}
