import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from './queries/useLayoutSetsQuery';
import { useReactiveLocalStorage } from 'app-shared/hooks/useReactiveLocalStorage';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
  removeSelectedFormLayoutSetName: () => void;
};

export const useSelectedFormLayoutSetName = (): UseSelectedFormLayoutSetNameResult => {
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const [selectedFormLayoutSetName, setSelectedFormLayoutSetName, removeSelectedFormLayoutSetName] =
    useReactiveLocalStorage('layoutSet/' + app, undefined);

  if (layoutSets) {
    if (
      !selectedFormLayoutSetName ||
      !layoutSets.sets.find((item) => item.id === selectedFormLayoutSetName)
    ) {
      setSelectedFormLayoutSetName(layoutSets.sets[0].id);
    }
  }

  return {
    selectedFormLayoutSetName,
    setSelectedFormLayoutSetName,
    removeSelectedFormLayoutSetName,
  };
};
