import { useBpmnContext } from '../../../../contexts/BpmnContext';

export type PdfConfig = {
  autoPdfTaskIds?: {
    taskIds?: { value: string }[];
  };
  filenameTextResourceKey?: {
    value: string;
  };
};

type UsePdfConfigResult = {
  pdfConfig: PdfConfig;
  storedFilenameTextResourceId: string;
};

export const usePdfConfig = (): UsePdfConfigResult => {
  const { bpmnDetails } = useBpmnContext();

  const pdfConfig: PdfConfig =
    bpmnDetails?.element?.businessObject?.extensionElements?.values?.[0]?.pdfConfig ?? {};

  const storedFilenameTextResourceId = pdfConfig.filenameTextResourceKey?.value ?? '';

  return {
    pdfConfig,
    storedFilenameTextResourceId,
  };
};
