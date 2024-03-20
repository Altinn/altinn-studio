import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useReactiveLocalStorage } from 'app-shared/hooks/useReactiveLocalStorage';

export type UseSelectedFormLayoutSetNameResult = {
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutName: string) => void;
  removeFormSelectedLayoutSetName: () => void;
};

export const useSelectedFormLayoutSetName = (): UseSelectedFormLayoutSetNameResult => {
  const { app } = useStudioUrlParams();

  // const isValidLayout = (layoutName: string): boolean => {
  //   const isExistingLayout = layoutPagesOrder?.includes(layoutName);
  //   const isReceipt = formLayoutSettings?.receiptLayoutName === layoutName;
  //   return isExistingLayout || isReceipt;
  // };

  const [selectedFormLayoutSetName, setSelectedFormLayoutSetName, removeFormSelectedLayoutSetName] =
    useReactiveLocalStorage(
      'layoutSet/' + app,
      undefined /*, (value: string) => {
      return isValidLayout(value) ? value : undefined;
    }*/,
    );

  return {
    selectedFormLayoutSetName,
    setSelectedFormLayoutSetName,
    removeFormSelectedLayoutSetName,
  };
};
