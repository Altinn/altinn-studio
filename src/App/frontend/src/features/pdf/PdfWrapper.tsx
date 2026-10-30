import React from 'react';
import { useSearchParams } from 'react-router';
import type { PropsWithChildren } from 'react';

import { SearchParams } from 'src/core/routing/types';
import { FormProvider } from 'src/features/form/FormProvider';
import { getUiFolderSettings } from 'src/features/form/ui';
import { findProcessTask, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { PdfForServiceTask, PdfForSubform, PdfFromLayout } from 'src/features/pdf/PdfFromLayout';
import { useAllNavigationParams } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { IProcess } from 'src/types/shared';

export const usePdfModeActive = useIsPdf;

/**
 * In PDF mode, renders the task's PDF in place of the task (see getPdfSource). It wraps the task route, so the PDF
 * renders from here whatever page the URL is on, and nothing below it renders in PDF mode unless the URL has no PDF
 * source here.
 */
export function PdfWrapper({ children }: PropsWithChildren) {
  const isPdf = useIsPdf();
  const path = useAllNavigationParams();
  const { data: process } = useProcessQuery();
  const [params] = useSearchParams();

  switch (isPdf ? getPdfSource(process, path, params) : undefined) {
    case 'subform':
      return <PdfForSubform />;
    case 'automatic':
      return <PdfForServiceTask />;
    case 'layout':
      return (
        <FormProvider>
          <PdfFromLayout />
        </FormProvider>
      );
    default:
      return children;
  }
}

/**
 * Where the PDF of a URL comes from, at the task route:
 * - `subform`: one subform entry, named in the search params, rendered from the subform's UI folder.
 * - `layout`: the task's UI folder, which renders its `pdfLayoutName` or else its pages.
 * - `automatic`: the tasks passed as `task` search params, each from its own UI folder.
 * - none: the task route renders as it does outside PDF mode.
 *
 * A subform entry's own route has none here: SubformForm renders the entry's PDF, inside the task's form, which is
 * what names the subform's UI folder. A PDF service task's PDF is its folder's `pdfLayoutName` when that is set, and the
 * automatic PDF otherwise, whether or not the folder exists: the pages in its order are a waiting page, never PDF
 * content. Any other service task gets its folder, or the automatic PDF without one. Any other task gets its folder,
 * and has none without one.
 */
export function getPdfSource(
  process: IProcess | undefined,
  { taskId, dataElementId }: { taskId?: string; dataElementId?: string },
  params: URLSearchParams,
): 'subform' | 'layout' | 'automatic' | undefined {
  if (params.has(SearchParams.PdfSubformUiFolder) || params.has(SearchParams.PdfSubformDataElementId)) {
    return 'subform';
  }
  if (dataElementId) {
    return undefined;
  }

  const task = findProcessTask(process, taskId);
  const settings = getUiFolderSettings(taskId);
  if (task?.elementType !== ELEMENT_TYPE.SERVICE_TASK) {
    return settings ? 'layout' : undefined;
  }
  if (task.altinnTaskType === 'pdf') {
    return settings?.pages.pdfLayoutName?.trim() ? 'layout' : 'automatic';
  }
  return settings ? 'layout' : 'automatic';
}
