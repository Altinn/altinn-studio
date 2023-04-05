function getPdfQueryParam(): string | null {
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  return params.get('pdf');
}

export function pdfPreviewMode(): boolean {
  return getPdfQueryParam() === 'preview';
}

export function shouldGeneratePdf(): boolean {
  const pdfQueryParam = getPdfQueryParam();
  return pdfQueryParam === '1' || pdfQueryParam === 'preview';
}

export async function waitForSelector(selector: string, timeOut = 5000) {
  const start = performance.now();
  while (document.querySelector(selector) === null) {
    if (performance.now() - start > timeOut) {
      return null;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return document.querySelector(selector);
}
