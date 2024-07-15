import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useEffect, useState } from 'react';
import { typedLocalStorage } from '@studio/components/src/hooks/webStorage';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
};

export const useSelectedFormLayoutSetName = (): UseSelectedFormLayoutSetNameResult => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const storageKey: string = 'selectedFormLayoutSetName';
  const [selectedFormLayoutSetNameState, setSelectedFormLayoutSetName] = useState(
    typedLocalStorage.getItem<string>(storageKey),
  );

  useEffect(() => {
    if (selectedFormLayoutSetNameState)
      typedLocalStorage.setItem<string>(storageKey, selectedFormLayoutSetNameState);
  }, [selectedFormLayoutSetNameState]);

  let selectedFormLayoutSetName: string;

  if (layoutSets?.sets.length > 0) {
    if (layoutSets.sets.find((item) => item.id === selectedFormLayoutSetNameState)) {
      selectedFormLayoutSetName = selectedFormLayoutSetNameState;
    } else {
      selectedFormLayoutSetName = layoutSets.sets[0].id;
    }
  }

  return {
    selectedFormLayoutSetName,
    setSelectedFormLayoutSetName,
  };
};
