import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { getTaskIdForLayoutSet } from 'app-shared/utils/layoutSetsUtils';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';

type UseCurrentLayoutSetResult = {
  currentLayoutSet: LayoutSetConfig | undefined;
};

export const useCurrentLayoutSet = (): UseCurrentLayoutSetResult => {
  const { bpmnDetails } = useBpmnContext();
  const { layoutSets } = useBpmnApiContext();

  const currentLayoutSet = layoutSets?.find(
    (layoutSet) => getTaskIdForLayoutSet(layoutSet) === bpmnDetails?.id,
  );

  return {
    currentLayoutSet,
  };
};
