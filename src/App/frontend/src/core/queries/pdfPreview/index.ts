import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { getUiFolderSettings } from 'src/features/form/ui';

const pdfPreviewQueryKeys = {
  subformDataTypes: (taskId: string | undefined) => ['pdfPreview', 'subformDataTypes', taskId] as const,
};

/**
 * A subform PDF service task renders its subform through the Subform component in the task's own UI folder. The
 * default data type of that component's layout set identifies the data type of the subforms the task renders. If the
 * folder has several Subform components, use the one whose data type the folder itself uses.
 */
export function usePdfPreviewSubformDataTypes(taskId: string | undefined): string[] {
  const { fetchLayouts } = useAppQueries();
  const { data = [] } = useQuery({
    queryKey: pdfPreviewQueryKeys.subformDataTypes(taskId),
    queryFn: taskId ? () => fetchLayouts(taskId) : skipToken,
    select: (layouts) =>
      Object.values(layouts)
        .flatMap((page) => page.data.layout)
        .flatMap((component) =>
          component.type === 'Subform' ? [getUiFolderSettings(component.layoutSet)?.defaultDataType] : [],
        )
        .filter((dataType) => dataType !== undefined),
  });

  const folderDataType = getUiFolderSettings(taskId)?.defaultDataType;
  return folderDataType !== undefined && data.includes(folderDataType) ? [folderDataType] : data;
}
