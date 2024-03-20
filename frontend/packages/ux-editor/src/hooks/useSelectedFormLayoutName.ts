import { useSearchParamsState } from '../../../shared/src/hooks/useSearchParamsState';
import { useFormLayoutSettingsQuery } from './queries/useFormLayoutSettingsQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useReactiveLocalStorage } from 'app-shared/hooks/useReactiveLocalStorage';

export type UseSelectedFormLayoutNameResult = {
  selectedFormLayoutName: string;
  setSelectedFormLayoutName: (layoutName: string) => void;
};

export const useSelectedFormLayoutName = (): UseSelectedFormLayoutNameResult => {
  const { org, app } = useStudioUrlParams();
  const [selectedLayoutSet] = useReactiveLocalStorage('layoutSet/' + app, null);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const layoutPagesOrder = formLayoutSettings?.pages.order;

  const isValidLayout = (layoutName: string): boolean => {
    const isExistingLayout = layoutPagesOrder?.includes(layoutName);
    const isReceipt = formLayoutSettings?.receiptLayoutName === layoutName;
    return isExistingLayout || isReceipt;
  };

  const [selectedFormLayoutName, setSelectedFormLayoutName] = useSearchParamsState<string>(
    'layout',
    undefined,
    (value: string) => {
      return isValidLayout(value) ? value : undefined;
    },
  );

  return {
    selectedFormLayoutName,
    setSelectedFormLayoutName,
  };
};
