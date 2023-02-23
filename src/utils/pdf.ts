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
