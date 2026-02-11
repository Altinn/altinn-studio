import { getLayoutSets } from 'src/features/form/layoutSets';

export function useDataTypeFromLayoutSet(layoutSetName: string | undefined) {
  const layoutSets = getLayoutSets();
  return layoutSets.find((set) => set.id === layoutSetName)?.dataType;
}
