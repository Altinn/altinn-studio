import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useState } from 'react';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
};

export const useSelectedFormLayoutSetName = (): UseSelectedFormLayoutSetNameResult => {
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const [selectedFormLayoutSetNameState, setSelectedFormLayoutSetName] = useState(undefined);

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
