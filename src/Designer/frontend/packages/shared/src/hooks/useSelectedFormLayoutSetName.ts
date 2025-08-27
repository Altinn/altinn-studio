import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLocalStorage } from '@studio/components-legacy/hooks/useLocalStorage';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
  removeSelectedFormLayoutSetName: () => void;
};

export const useSelectedFormLayoutSetName = (
  layoutSets: LayoutSets,
): UseSelectedFormLayoutSetNameResult => {
  const { app } = useStudioEnvironmentParams();
  const [selectedFormLayoutSetName, setSelectedFormLayoutSetName, removeSelectedFormLayoutSetName] =
    useLocalStorage<string>('layoutSet/' + app);

  const layoutSetExists = layoutSets?.sets.some((set) => set.id === selectedFormLayoutSetName);

  return {
    selectedFormLayoutSetName: layoutSetExists ? selectedFormLayoutSetName : undefined,
    setSelectedFormLayoutSetName,
    removeSelectedFormLayoutSetName,
  };
};
