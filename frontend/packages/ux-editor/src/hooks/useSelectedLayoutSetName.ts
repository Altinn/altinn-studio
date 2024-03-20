import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useReactiveLocalStorage } from 'app-shared/hooks/useReactiveLocalStorage';

export type UseSelectedLayoutSetNameResult = {
  selectedLayoutSetName: string;
  setSelectedLayoutSetName: (layoutName: string) => void;
  removeSelectedLayoutSetName: () => void;
};

export const useSelectedLayoutSetName = (): UseSelectedLayoutSetNameResult => {
  const { app } = useStudioUrlParams();

  // const isValidLayout = (layoutName: string): boolean => {
  //   const isExistingLayout = layoutPagesOrder?.includes(layoutName);
  //   const isReceipt = formLayoutSettings?.receiptLayoutName === layoutName;
  //   return isExistingLayout || isReceipt;
  // };

  const [selectedLayoutSetName, setSelectedLayoutSetName, removeSelectedLayoutSetName] =
    useReactiveLocalStorage(
      'layoutSet/' + app,
      undefined /*, (value: string) => {
      return isValidLayout(value) ? value : undefined;
    }*/,
    );

  return {
    selectedLayoutSetName,
    setSelectedLayoutSetName,
    removeSelectedLayoutSetName,
  };
};
