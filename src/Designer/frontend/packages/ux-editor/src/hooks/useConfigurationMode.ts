import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import useUxEditorParams from './useUxEditorParams';
import { useLayoutSetsExtendedQuery } from './queries/useLayoutSetsExtendedQuery';
import { ElementsUtils } from '../components/Elements/ElementsUtils';
import type { ConfPageType } from '../components/Elements/types/ConfigPageType';

export const useConfigurationMode = (): ConfPageType | undefined => {
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { data: layoutSets } = useLayoutSetsExtendedQuery(org, app);

  const selectedLayoutSet = layoutSets?.find((set) => set.id === layoutSet);

  return ElementsUtils.getConfigurationMode({
    selectedLayoutIsCustomReceipt: selectedLayoutSet?.id === PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
    processTaskType: selectedLayoutSet?.taskType,
    selectedLayoutSetType: selectedLayoutSet?.type,
  });
};
