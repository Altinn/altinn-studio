import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { getTaskIdForLayoutSet } from 'app-shared/utils/layoutSetsUtils';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';

type UseCurrentLayoutSetResult = {
  currentLayoutSet: LayoutSetConfig | undefined;
};

/**
 * The layout set connected to the selected bpmn element, which is also the ui folder the app
 * frontend renders for it. Undefined when the element has none: only some task types get a layout
 * set, and a task that has one got it from the developer rather than from Studio.
 */
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
