import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useLocalStorage } from '@studio/components/src/hooks/useLocalStorage';
import { toast } from 'react-toastify';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
};

export const useSelectedFormLayoutSetName = (): UseSelectedFormLayoutSetNameResult => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const defaultLayoutSet = layoutSets?.sets[0]?.id;

  const [selectedFormLayoutSetName, setSelectedFormLayoutSetName] = useLocalStorage<string>(
    'layoutSet/' + app,
  );

  const layoutSetExists = layoutSets?.sets.some((set) => set.id === selectedFormLayoutSetName); // Kan det være her????

  !layoutSetExists && toast.error('useSelectedFormLayoutSetName');

  console.log('useSelectedFormLayoutSetName', {
    layoutSetExists,
    selectedFormLayoutSetName,
    defaultLayoutSet,
  });

  return {
    selectedFormLayoutSetName: layoutSetExists ? selectedFormLayoutSetName : defaultLayoutSet,
    setSelectedFormLayoutSetName,
  };
};
