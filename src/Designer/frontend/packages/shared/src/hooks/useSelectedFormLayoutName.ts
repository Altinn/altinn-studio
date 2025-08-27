import { useSearchParamsState } from 'app-shared/hooks/useSearchParamsState';
import { useFormLayoutSettingsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutSettingsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useGetPageByName } from '@altinn/ux-editor/hooks/useGetPageByName';

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
  const getPage = useGetPageByName({ org, app, layoutSetName: selectedFormLayoutSetName });

  const isValidLayout = (pageName: string): boolean => {
    const pageExists = getPage(pageName) !== undefined;
    const isPdf = formLayoutSettings?.pages?.pdfLayoutName === pageName;
    return pageExists || isPdf;
  };

  const [selectedFormLayoutName, setSelectedFormLayoutName] = useSearchParamsState<string>(
    'layout',
    undefined,
    (pageName: string) => {
      return isValidLayout(pageName) ? pageName : undefined;
    },
  );

  return {
    selectedFormLayoutName,
    setSelectedFormLayoutName,
  };
};
