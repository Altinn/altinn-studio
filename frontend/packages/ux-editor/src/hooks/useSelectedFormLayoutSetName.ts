import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useEffect, useState } from 'react';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
};

export const useSelectedFormLayoutSetName = (): UseSelectedFormLayoutSetNameResult => {
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const savedLayoutSetName = localStorage.getItem('selectedFormLayoutSetName');
  const [selectedFormLayoutSetNameState, setSelectedFormLayoutSetName] =
    useState(savedLayoutSetName);

  useEffect(() => {
    if (selectedFormLayoutSetNameState) {
      localStorage.setItem('selectedFormLayoutSetName', selectedFormLayoutSetNameState);
    }
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
