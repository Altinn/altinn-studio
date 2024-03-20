import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from './queries/useLayoutSetsQuery';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
  removeFormSelectedLayoutSetName: () => void;
};

export const useSelectedFormLayoutSetName = (): UseSelectedFormLayoutSetNameResult => {
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const [selectedFormLayoutSetName, setSelectedFormLayoutSetName, removeFormSelectedLayoutSetName] =
    useLocalStorage('layoutSet/' + app, undefined);

  if (layoutSets) {
    if (
      !selectedFormLayoutSetName ||
      layoutSets.sets.some((item) => item.id !== selectedFormLayoutSetName)
    ) {
      setSelectedFormLayoutSetName(layoutSets.sets[0].id);
    }
  }

  return {
    selectedFormLayoutSetName,
    setSelectedFormLayoutSetName,
    removeFormSelectedLayoutSetName,
  };
};
