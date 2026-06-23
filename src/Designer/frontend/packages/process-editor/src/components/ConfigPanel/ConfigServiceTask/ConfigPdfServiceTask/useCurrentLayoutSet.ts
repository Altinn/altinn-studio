import type { LayoutSetResponse } from 'app-shared/utils/layoutSetsUtils';
import { getTaskId } from 'app-shared/utils/layoutSetsUtils';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';

type UseCurrentLayoutSetResult = {
  currentLayoutSet: LayoutSetResponse | undefined;
};

export const useCurrentLayoutSet = (): UseCurrentLayoutSetResult => {
  const { bpmnDetails } = useBpmnContext();
  const { layoutSets } = useBpmnApiContext();

  const currentLayoutSet = layoutSets?.find(
    (layoutSet) => getTaskId(layoutSet) === bpmnDetails?.id,
  );

  return {
    currentLayoutSet,
  };
};
