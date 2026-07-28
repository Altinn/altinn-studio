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

  try {
    const response = await fetch(getPdfPreviewUrl(instanceId, language), {
      signal,
      headers: { Pragma: 'no-cache' },
    });

    if (response.status !== 200 || !response.headers.get('Content-Type')?.toLowerCase().startsWith('application/pdf')) {
      const text = await response.text();
      return { type: 'error', message: `${response.status} ${response.statusText}\n${text}` };
    }

    return { type: 'success', blob: await response.blob() };
  } catch (error) {
    return {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
