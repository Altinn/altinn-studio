import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useChecksum } from '../../../../hooks/useChecksum';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';
import { TaskUtils } from '../../../../utils/taskUtils';

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
  updateFilenameTextResourceKey: (textResourceId: string) => void;
  updateTaskIds: (taskIds: string[]) => void;
};

export const usePdfConfig = (): UsePdfConfigResult => {
  const { bpmnDetails } = useBpmnContext();
  const { updateChecksum } = useChecksum();
  const taskExtension = TaskUtils.getTaskExtension(bpmnDetails.element);
  const pdfConfig: PdfConfig = taskExtension?.pdfConfig ?? {};
  const storedFilenameTextResourceId = pdfConfig.filenameTextResourceKey?.value ?? '';

  const updateConfig = (
    studioModeler: StudioModeler,
    properties: Record<string, ModdleElement | undefined>,
  ): void => {
    if (taskExtension.pdfConfig) {
      studioModeler.updateModdleProperties(properties, taskExtension.pdfConfig);
    } else {
      studioModeler.updateModdleProperties(
        { pdfConfig: studioModeler.createElement('altinn:PdfConfig', properties) },
        taskExtension,
      );
    }
    updateChecksum();
  };

  const updateFilenameTextResourceKey = (textResourceId: string): void => {
    if (textResourceId === storedFilenameTextResourceId) return;
    const studioModeler = new StudioModeler(bpmnDetails.element);
    updateConfig(studioModeler, {
      filenameTextResourceKey: textResourceId
        ? studioModeler.createElement('altinn:FilenameTextResourceKey', { value: textResourceId })
        : undefined,
    });
  };

  const updateTaskIds = (taskIds: string[]): void => {
    const studioModeler = new StudioModeler(bpmnDetails.element);
    const autoPdfTaskIds: ModdleElement = studioModeler.createElement('altinn:AutoPdfTaskIds', {
      taskIds: taskIds.map((value) => studioModeler.createElement('altinn:TaskId', { value })),
    });
    updateConfig(studioModeler, { autoPdfTaskIds });
  };

  return { pdfConfig, storedFilenameTextResourceId, updateFilenameTextResourceKey, updateTaskIds };
};
