import type { PDFPreviewGenerateResult } from '@app/form-component';

import { getPdfPreviewUrl } from 'src/utils/urls/appUrlHelper';
import type { IPdfPreviewUrlOptions } from 'src/utils/urls/appUrlHelper';

async function extractErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const problemDetails: unknown = JSON.parse(text);
    if (
      problemDetails &&
      typeof problemDetails === 'object' &&
      'detail' in problemDetails &&
      typeof (problemDetails as { detail: unknown }).detail === 'string'
    ) {
      return (problemDetails as { detail: string }).detail;
    }
  } catch {
    // Not JSON, fall back to raw text below
  }
  return text;
}

export async function generatePdfPreview(
  instanceId: string | undefined,
  language: string,
  signal: AbortSignal,
  options?: IPdfPreviewUrlOptions,
): Promise<PDFPreviewGenerateResult> {
  if (!instanceId) {
    return { type: 'error', message: 'Missing instance id' };
  }

  try {
    const response = await fetch(getPdfPreviewUrl(instanceId, language, options), {
      signal,
      headers: { Pragma: 'no-cache' },
    });

    if (response.status !== 200 || !response.headers.get('Content-Type')?.toLowerCase().startsWith('application/pdf')) {
      const message = await extractErrorMessage(response);
      return { type: 'error', message: `${response.status} ${response.statusText}\n${message}` };
    }

    return { type: 'success', blob: await response.blob() };
  } catch (error) {
    return {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
