import { useSearchParamsState } from '../../../shared/src/hooks/useSearchParamsState';
import { useFormLayoutSettingsQuery } from './queries/useFormLayoutSettingsQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useReactiveLocalStorage } from 'app-shared/hooks/useReactiveLocalStorage';

export type UseSelectedLayoutNameResult = {
  selectedLayoutName: string;
  setSelectedLayoutName: (layoutName: string) => void;
};

export const useSelectedLayoutName = (): UseSelectedLayoutNameResult => {
  const { org, app } = useStudioUrlParams();
  const [selectedLayoutSet] = useReactiveLocalStorage('layoutSet/' + app, null);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const layoutPagesOrder = formLayoutSettings?.pages.order;

  const isValidLayout = (layoutName: string): boolean => {
    const isExistingLayout = layoutPagesOrder?.includes(layoutName);
    const isReceipt = formLayoutSettings?.receiptLayoutName === layoutName;
    return isExistingLayout || isReceipt;
  };

  const [selectedLayoutName, setSelectedLayoutName] = useSearchParamsState<string>(
    'layout',
    undefined,
    (value: string) => {
      return isValidLayout(value) ? value : undefined;
    },
  );

  return {
    selectedLayoutName,
    setSelectedLayoutName,
  };
};
