import { validate as isUuid } from 'uuid';

import { SearchParams } from 'src/core/routing/types';

export interface PdfRenderContext {
  uiFolder: string;
  dataElementId: string;
}

/** Explicit PDF targets do not use the interactive form's component routing. */
export function getPdfRenderContext(params: URLSearchParams): PdfRenderContext | undefined {
  if (!params.has(SearchParams.PdfUiFolder) && !params.has(SearchParams.PdfDataElementId)) {
    return undefined;
  }

  const uiFolder = params.get(SearchParams.PdfUiFolder);
  const dataElementId = params.get(SearchParams.PdfDataElementId);
  if (
    params.getAll(SearchParams.Pdf).length !== 1 ||
    params.get(SearchParams.Pdf) !== '1' ||
    params.getAll(SearchParams.PdfUiFolder).length !== 1 ||
    params.getAll(SearchParams.PdfDataElementId).length !== 1 ||
    params.has(SearchParams.PdfForTask) ||
    !uiFolder ||
    !dataElementId ||
    !isUuid(dataElementId)
  ) {
    throw new Error('Invalid PDF render context: pdf=1, one UI folder, and one data element id are required.');
  }

  return { uiFolder, dataElementId: dataElementId.toLowerCase() };
}
