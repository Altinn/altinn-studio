import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
};

export const useSelectedFormLayoutSetName = (
  layoutSets: LayoutSets,
): UseSelectedFormLayoutSetNameResult => {
  const { app } = useStudioEnvironmentParams();

  const defaultLayoutSet = layoutSets?.sets[0]?.id ?? '';

  const [selectedFormLayoutSetName, setSelectedFormLayoutSetName] = useLocalStorage<string>(
    'layoutSet/' + app,
  );

  const layoutSetExists = layoutSets?.sets.some((set) => set.id === selectedFormLayoutSetName);

  return {
    selectedFormLayoutSetName: layoutSetExists ? selectedFormLayoutSetName : defaultLayoutSet,
    setSelectedFormLayoutSetName,
  };
};
