import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnConfigPanelFormContext } from '../../../../contexts/BpmnConfigPanelContext';
import { TaskUtils } from '../../../../utils/taskUtils';

const SUBFORM_PDF_CONFIG_TYPE = 'altinn:SubformPdfConfig';
const FILENAME_TEXT_RESOURCE_KEY_TYPE = 'altinn:FilenameTextResourceKey';

export type UseSubformPdfConfigResult = {
  subformUiFolder: string;
  /** The Subform component that a task set up before subformUiFolder names instead. */
  subformComponentId: string;
  filenameTextResourceId: string;
  setSubformUiFolder: (subformUiFolder: string) => void;
  setFilenameTextResourceId: (textResourceId: string) => void;
};

/** Imported tasks can omit subformPdfConfig. */
export const useSubformPdfConfig = (): UseSubformPdfConfigResult => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const { metadataFormRef } = useBpmnConfigPanelFormContext();
  const modeling = modelerRef.current.get<Modeling>('modeling');
  const moddle = modelerRef.current.get<Moddle>('moddle');

  const taskExtension: ModdleElement | undefined = TaskUtils.getTaskExtension(bpmnDetails?.element);
  const subformPdfConfig: ModdleElement | undefined = taskExtension?.subformPdfConfig;

  const subformUiFolder: string = subformPdfConfig?.subformUiFolder ?? '';
  const subformComponentId: string = subformPdfConfig?.subformComponentId ?? '';
  const filenameTextResourceId: string = subformPdfConfig?.filenameTextResourceKey?.value ?? '';

  const updateConfig = (properties: object): void => {
    if (taskExtension.subformPdfConfig) {
      modeling.updateModdleProperties(
        bpmnDetails.element,
        taskExtension.subformPdfConfig,
        properties,
      );
    } else {
      modeling.updateModdleProperties(bpmnDetails.element, taskExtension, {
        subformPdfConfig: moddle.create(SUBFORM_PDF_CONFIG_TYPE, properties),
      });
    }
  };

  /**
   * Also removes the settings that subformUiFolder replaces, and has the backend remove the UI folder that
   * Studio generated for them.
   */
  const setSubformUiFolder = (newSubformUiFolder: string): void => {
    if (newSubformUiFolder === subformUiFolder) return;
    if (newSubformUiFolder && subformComponentId) {
      metadataFormRef.current = {
        ...metadataFormRef.current,
        subformPdfConfigUpgrade: { taskId: bpmnDetails.id, subformComponentId },
      };
    }
    updateConfig({
      subformUiFolder: newSubformUiFolder || undefined,
      subformComponentId: undefined,
      subformDataTypeId: undefined,
    });
  };

  const setFilenameTextResourceId = (textResourceId: string): void => {
    if (textResourceId === filenameTextResourceId) return;
    updateConfig({
      filenameTextResourceKey: textResourceId
        ? moddle.create(FILENAME_TEXT_RESOURCE_KEY_TYPE, { value: textResourceId })
        : undefined,
    });
  };

  return {
    subformUiFolder,
    subformComponentId,
    filenameTextResourceId,
    setSubformUiFolder,
    setFilenameTextResourceId,
  };
};
