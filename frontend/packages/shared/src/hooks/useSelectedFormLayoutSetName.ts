import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLocalStorage } from '@studio/components-legacy/src/hooks/useLocalStorage';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
  removeSelectedFormLayoutSetName: () => void;
};

export const useSelectedFormLayoutSetName = (
  layoutSets: LayoutSets,
): UseSelectedFormLayoutSetNameResult => {
  const { app } = useStudioEnvironmentParams();
  const isTaskNavigationEnabled = shouldDisplayFeature(FeatureFlag.TaskNavigation);

  const defaultLayoutSet = isTaskNavigationEnabled ? undefined : (layoutSets?.sets[0]?.id ?? '');

  const [selectedFormLayoutSetName, setSelectedFormLayoutSetName, removeSelectedFormLayoutSetName] =
    useLocalStorage<string>('layoutSet/' + app);

  const layoutSetExists = layoutSets?.sets.some((set) => set.id === selectedFormLayoutSetName);

  return {
    selectedFormLayoutSetName: layoutSetExists ? selectedFormLayoutSetName : defaultLayoutSet,
    setSelectedFormLayoutSetName,
    removeSelectedFormLayoutSetName,
  };
};
