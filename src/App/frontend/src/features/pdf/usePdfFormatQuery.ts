import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { type QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui';
import { useCurrentUiFolderNameFromUrl } from 'src/features/form/ui/hooks';
import { useInstanceDataQuery, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useNavigationParam } from 'src/hooks/navigation';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { IPdfFormatUrlOptions } from 'src/utils/urls/appUrlHelper';

export function usePdfFormatQueryDef(
  enabled: boolean,
  instanceId?: string,
  dataElementId?: string,
  options?: IPdfFormatUrlOptions,
): QueryDefinition<IPdfFormat> {
  const { fetchPdfFormat } = useAppQueries();
  return {
    queryKey: ['fetchPdfFormat', { instanceId, dataElementId, taskId: options?.taskId, uiFolder: options?.uiFolder }],
    queryFn: instanceId && dataElementId ? () => fetchPdfFormat(instanceId, dataElementId, options) : skipToken,
    enabled: enabled && !!instanceId && !!dataElementId,
    gcTime: 0,
  };
}

/**
 * This exists to support the legacy IPdfFormatter interface which was used with the old PDF generator to make it easier to migrate from the old one.
 * The IPdfFormatter interface is marked as obsolete in app-lib v8+ and can therefore be considered to be deprecated in frontend v4 as well.
 * The formatter receives the default data model along with the rendered task and UI folder, which may differ
 * from the instance's current task when previewing another task or a subform.
 * @deprecated should be removed in the next major version
 */
export const usePdfFormatQuery = (enabled: boolean): UseQueryResult<IPdfFormat> => {
  const instanceId = useLaxInstanceId();
  const taskIdFromUrl = useNavigationParam('taskId');
  const overrides = useTaskOverrides();
  const taskId = overrides.taskId ?? taskIdFromUrl;
  const uiFolder = useCurrentUiFolderNameFromUrl();
  const dataType = getDefaultDataTypeFromUiFolder(uiFolder);
  const { data: dataElementId } = useInstanceDataQuery({
    select: (instance) =>
      overrides.dataModelElementId ?? instance.data.find((element) => element.dataType === dataType)?.id,
  });

  const ready = typeof dataElementId === 'string';
  const utils = useQuery(usePdfFormatQueryDef(enabled && ready, instanceId, dataElementId, { taskId, uiFolder }));

  useEffect(() => {
    utils.error && window.logError('Fetching PDF format failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};
