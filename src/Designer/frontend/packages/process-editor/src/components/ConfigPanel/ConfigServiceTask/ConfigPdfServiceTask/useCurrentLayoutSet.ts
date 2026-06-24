import type { LayoutSet } from 'app-shared/types/api/LayoutSetsResponse';
import { getTaskIdForLayoutSet } from 'app-shared/utils/layoutSetsUtils';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';

type UseCurrentLayoutSetResult = {
  currentLayoutSet: LayoutSet | undefined;
};

export const useCurrentLayoutSet = (): UseCurrentLayoutSetResult => {
  const { bpmnDetails } = useBpmnContext();
  const { layoutSets } = useBpmnApiContext();

  const currentLayoutSet = layoutSets?.sets?.find(
    (layoutSet) => getTaskIdForLayoutSet(layoutSet) === bpmnDetails?.id,
  );

  return {
    currentLayoutSet,
  };
};
