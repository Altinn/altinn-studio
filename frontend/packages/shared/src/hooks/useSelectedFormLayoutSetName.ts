import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLocalStorage } from '@studio/components/src/hooks/useLocalStorage';
import { toast } from 'react-toastify';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const defaultLayoutSetName: string = 'form';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
};

export const useSelectedFormLayoutSetName = (
  layoutSets: LayoutSets,
): UseSelectedFormLayoutSetNameResult => {
  const { app } = useStudioEnvironmentParams();

  const defaultLayoutSet = layoutSets?.sets[0]?.id ?? defaultLayoutSetName;

  const [selectedFormLayoutSetName, setSelectedFormLayoutSetName] = useLocalStorage<string>(
    'layoutSet/' + app,
  );

  const layoutSetExists = layoutSets?.sets.some((set) => set.id === selectedFormLayoutSetName); // Kan det være her????

  if (!layoutSetExists) toast.error('useSelectedFormLayoutSetName');

  console.log('useSelectedFormLayoutSetName', {
    layoutSetExists,
    selectedFormLayoutSetName,
    defaultLayoutSet,
  });

  return {
    selectedFormLayoutSetName: layoutSetExists ? selectedFormLayoutSetName : defaultLayoutSet, // MÅ FIKSES
    setSelectedFormLayoutSetName,
  };
};
