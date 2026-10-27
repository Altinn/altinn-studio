import React from 'react';
import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { fetchFreshInstanceData } from 'src/core/queries/instance';
import { getUiConfig } from 'src/features/form/ui';
import { getTaskTypeById } from 'src/features/instance/useProcessQuery';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { PdfWrapper } from 'src/features/pdf/PdfWrapper';
import { isPdfRequest } from 'src/hooks/useIsPdf';
import { apiClientsContext } from 'src/routerContexts/apiClientRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { ProcessTaskType } from 'src/types';
import { computeStartUrl, getRawFirstPage } from 'src/utils/computeStartUrl';

export async function clientLoader({ context, params, request }: LoaderFunctionArgs): Promise<Response | null> {
  const queryClient = context.get(queryClientContext);
  const { instanceApi } = context.get(apiClientsContext);
  const { instanceOwnerPartyId, instanceGuid, taskId } = params;
  if (!instanceOwnerPartyId || !instanceGuid || !taskId) {
    throw new Error('task-index loader reached without instanceOwnerPartyId/instanceGuid/taskId route params');
  }

  const instance = await fetchFreshInstanceData(queryClient, {
    instanceOwnerPartyId,
    instanceGuid,
    instanceApi,
  });
  const processData = instance?.process;
  const uiFolders = getUiConfig().folders;
  const taskType = getTaskTypeById(processData, taskId, false, uiFolders, isPdfRequest(request));
  const firstPage = getRawFirstPage(taskId);
  const queryKeys = new URL(request.url).search;

  if (taskType !== ProcessTaskType.Data || !firstPage) {
    return null;
  }

  const startUrl = computeStartUrl({
    instanceOwnerPartyId,
    instanceGuid,
    taskId,
    queryKeys,
    firstPage,
    taskType,
    isStateless: false,
  });

  return redirect(startUrl);
}

// A task without a first page still has a PDF: a PDF task's folder can list no page and only hold its pdfLayoutName
// page, and the automatic PDF needs no page of its own. PDF mode draws it here instead.
export default function TaskIndex() {
  return (
    <PdfWrapper>
      <UnknownError error={new Error('Failed to redirect from the task index page')} />
    </PdfWrapper>
  );
}
