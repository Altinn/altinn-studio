import { useAppContext } from '../index';
import { useSavableFormLayoutSettings } from '../useSavableFormLayoutSettings';

export const usePdf = () => {
  const { selectedFormLayoutName } = useAppContext();
  const savableLayoutSettings = useSavableFormLayoutSettings();
  const layoutSettings = savableLayoutSettings.getFormLayoutSettings();

  const getPdfLayoutName = (): string => {
    return layoutSettings.getPdfLayoutName();
  };

  const isCurrentPagePdf = (): boolean => {
    return layoutSettings.getPdfLayoutName() === selectedFormLayoutName;
  };

  const convertCurrentPageToPdf = (): void => {
    layoutSettings.setPdfLayoutName(selectedFormLayoutName);
    layoutSettings.deletePageFromOrder(selectedFormLayoutName);
  };

  const convertExistingPdfToPage = (): void => {
    const existingPdfLayout = layoutSettings.getPdfLayoutName();
    layoutSettings.addPageToOrder(existingPdfLayout);
    layoutSettings.deletePdfLayoutName();
  };

  return {
    getPdfLayoutName,
    isCurrentPagePdf,
    convertCurrentPageToPdf,
    convertExistingPdfToPage,
  };
};
