import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
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
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const modeling = modelerRef.current.get<Modeling>('modeling');
  const moddle = modelerRef.current.get<Moddle>('moddle');
  const taskExtension = TaskUtils.getTaskExtension(bpmnDetails.element);
  const pdfConfig: PdfConfig = taskExtension?.pdfConfig ?? {};
  const storedFilenameTextResourceId = pdfConfig.filenameTextResourceKey?.value ?? '';

  const updateConfig = (properties: Record<string, ModdleElement | undefined>): void => {
    if (taskExtension.pdfConfig) {
      modeling.updateModdleProperties(bpmnDetails.element, taskExtension.pdfConfig, properties);
    } else {
      modeling.updateModdleProperties(bpmnDetails.element, taskExtension, {
        pdfConfig: moddle.create('altinn:PdfConfig', properties),
      });
    }
  };

  const updateFilenameTextResourceKey = (textResourceId: string): void => {
    if (textResourceId === storedFilenameTextResourceId) return;
    updateConfig({
      filenameTextResourceKey: textResourceId
        ? moddle.create('altinn:FilenameTextResourceKey', { value: textResourceId })
        : undefined,
    });
  };

  const updateTaskIds = (taskIds: string[]): void => {
    const autoPdfTaskIds: ModdleElement = moddle.create('altinn:AutoPdfTaskIds', {
      taskIds: taskIds.map((value) => moddle.create('altinn:TaskId', { value })),
    });
    updateConfig({ autoPdfTaskIds });
  };

  return { pdfConfig, storedFilenameTextResourceId, updateFilenameTextResourceKey, updateTaskIds };
};
