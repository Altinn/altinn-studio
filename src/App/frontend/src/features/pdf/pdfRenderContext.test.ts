import { getPdfRenderContext } from 'src/features/pdf/pdfRenderContext';

const dataElementId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

describe('getPdfRenderContext', () => {
  it('preserves legacy print URLs', () => {
    expect(getPdfRenderContext(new URLSearchParams('pdf=1&task=Task_1'))).toBeUndefined();
  });

  it('reads the explicit subform folder and element', () => {
    expect(
      getPdfRenderContext(new URLSearchParams(`pdf=1&pdfUiFolder=subform&pdfDataElementId=${dataElementId}`)),
    ).toEqual({ uiFolder: 'subform', dataElementId });
  });

  it.each([
    `pdfUiFolder=subform&pdfDataElementId=${dataElementId}`,
    `pdf=0&pdfUiFolder=subform&pdfDataElementId=${dataElementId}`,
    'pdf=1&pdfUiFolder=subform',
    `pdf=1&pdfDataElementId=${dataElementId}`,
    `pdf=1&pdfUiFolder=&pdfDataElementId=${dataElementId}`,
    'pdf=1&pdfUiFolder=subform&pdfDataElementId=invalid',
    `pdf=1&pdfUiFolder=one&pdfUiFolder=two&pdfDataElementId=${dataElementId}`,
    `pdf=1&pdfUiFolder=subform&pdfDataElementId=${dataElementId}&pdfDataElementId=${dataElementId}`,
    `pdf=1&task=Task_1&pdfUiFolder=subform&pdfDataElementId=${dataElementId}`,
  ])('rejects malformed context instead of falling back to the form: %s', (query) => {
    expect(() => getPdfRenderContext(new URLSearchParams(query))).toThrow('Invalid PDF render context');
  });
});
