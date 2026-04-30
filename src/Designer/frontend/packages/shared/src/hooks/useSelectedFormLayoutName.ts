import { useSearchParamsState } from 'app-shared/hooks/useSearchParamsState';
import { useFormLayoutSettingsQuery } from '../../../ux-editor/src/hooks/queries/useFormLayoutSettingsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useGetPageByName } from '@altinn/ux-editor/hooks/useGetPageByName';
import { usePagesQuery } from '../../../ux-editor/src/hooks/queries/usePagesQuery';
import { findFirstPage } from '../../../ux-editor/src/utils/pageUtils';
export type UseSelectedFormLayoutNameResult = {
  selectedFormLayoutName: string;
  setSelectedFormLayoutName: (layoutName: string | undefined) => void;
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
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const getPage = useGetPageByName({ org, app, layoutSetName: selectedFormLayoutSetName });

  const isValidLayout = (pageName: string): boolean => {
    const pageExists = getPage(pageName) !== undefined;
    const isPdf = formLayoutSettings?.pages?.pdfLayoutName === pageName;
    return pageExists || isPdf;
  };

  const firstPageId = findFirstPage(pagesModel);

  const [selectedFormLayoutName, setSelectedFormLayoutName] = useSearchParamsState<string>(
    'layout',
    firstPageId,
    (pageName: string) => {
      return isValidLayout(pageName) ? pageName : firstPageId;
    },
  );

  return {
    selectedFormLayoutName,
    setSelectedFormLayoutName,
  };
};
