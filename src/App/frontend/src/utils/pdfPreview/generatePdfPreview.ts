import type { PDFPreviewGenerateResult } from '@app/form-component';

import { getPdfPreviewUrl } from 'src/utils/urls/appUrlHelper';

export async function generatePdfPreview(
  instanceId: string | undefined,
  language: string,
  signal: AbortSignal,
): Promise<PDFPreviewGenerateResult> {
  if (!instanceId) {
    return { type: 'error', message: 'Missing instance id' };
  }

  const response: Response | Error = await fetch(getPdfPreviewUrl(instanceId, language), {
    signal,
    headers: { Pragma: 'no-cache' },
  }).catch((error) => error);

  if (response instanceof Error) {
    return { type: 'error', message: response.message };
  }

  if (response.status !== 200 || response.headers.get('Content-Type') !== 'application/pdf') {
    const text = await response.text();
    return { type: 'error', message: `${response.status} ${response.statusText}\n${text}` };
  }

  return { type: 'success', blob: await response.blob() };
}
