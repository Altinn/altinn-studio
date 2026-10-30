import { skipToken, useQueries } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { getUiConfig } from 'src/features/form/ui';

const pdfPreviewQueryKeys = {
  layouts: (uiFolder: string) => ['pdfPreview', 'layouts', uiFolder] as const,
};

/**
 * The UI folders that a Subform component renders its entries from, through its `layoutSet`, or undefined while the
 * layouts load. Any other folder, such as a task's, CustomReceipt or a stateless one, holds no subform entries.
 */
export function useSubformUiFolders(enabled: boolean): string[] | undefined {
  const { fetchLayouts } = useAppQueries();
  const folders = Object.keys(getUiConfig().folders);

  return useQueries({
    queries: folders.map((folder) => ({
      queryKey: pdfPreviewQueryKeys.layouts(folder),
      queryFn: enabled ? () => fetchLayouts(folder) : skipToken,
    })),
    combine: (results) => {
      if (!enabled || results.some((result) => result.isPending)) {
        return undefined;
      }

      const subformFolders = results
        .flatMap((result) => Object.values(result.data ?? {}))
        .flatMap((page) => page.data.layout)
        .flatMap((component) => (component.type === 'Subform' ? [component.layoutSet] : []));
      return [...new Set(subformFolders)];
    },
  });
}
