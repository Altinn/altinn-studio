import { useSearchParamsState } from 'app-shared/hooks/useSearchParamsState';
import { useFormLayoutSettingsQuery } from '../../../ux-editor/src/hooks/queries/useFormLayoutSettingsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export type UseSelectedFormLayoutNameResult = {
  selectedFormLayoutName: string;
  setSelectedFormLayoutName: (layoutName: string) => void;
};

export const useSelectedFormLayoutName = (
  selectedFormLayoutSetName: string,
): UseSelectedFormLayoutNameResult => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const isValidLayout = (layoutName: string): boolean => {
    const layoutPagesOrder = formLayoutSettings?.pages?.order;
    return layoutPagesOrder?.includes(layoutName);
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
