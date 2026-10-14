import { FormStore } from 'src/features/form/FormContext';
import { usePdfExclusions } from 'src/features/form/layoutSettings/processLayoutSettings';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';

export function useExcludedPdfComponentIds(): string[] {
  const { components } = usePdfExclusions();
  const pdfMode = usePdfModeActive();
  return pdfMode ? components : [];
}

export function useIsExcludedFromPdf(baseComponentId: string): boolean {
  const excluded = useExcludedPdfComponentIds();
  const lookups = FormStore.bootstrap.useLayoutLookups();
  let id = baseComponentId;
  while (id) {
    if (excluded.includes(id)) {
      return true;
    }
    const parent = lookups.componentToParent[id];
    if (parent?.type !== 'node') {
      return false;
    }
    id = parent.id;
  }
  return false;
}
