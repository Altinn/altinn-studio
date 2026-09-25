import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useChecksum } from '../../../../hooks/useChecksum';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';
import { TaskUtils } from '../../../../utils/taskUtils';

const SUBFORM_PDF_CONFIG_TYPE = 'altinn:SubformPdfConfig';
const FILENAME_TEXT_RESOURCE_KEY_TYPE = 'altinn:FilenameTextResourceKey';

export type UseSubformPdfConfigResult = {
  subformComponentId: string;
  subformDataTypeId: string;
  filenameTextResourceId: string;
  setSubformComponentAndDataTypeIds: (
    subformComponentId: string,
    subformDataTypeId: string,
  ) => void;
  setSubformDataTypeId: (subformDataTypeId: string) => void;
  setFilenameTextResourceId: (textResourceId: string) => void;
};

/**
 * Reads and writes `<altinn:subformPdfConfig>` on the selected task, creating the node when a
 * hand-authored task lacks it. An emptied value removes its element rather than leaving a blank one.
 */
export const useSubformPdfConfig = (): UseSubformPdfConfigResult => {
  const { bpmnDetails } = useBpmnContext();
  const { updateChecksum: forceReRenderComponent } = useChecksum();

  const taskExtension: ModdleElement | undefined = TaskUtils.getTaskExtension(bpmnDetails?.element);
  const subformPdfConfig: ModdleElement | undefined = taskExtension?.subformPdfConfig;

  const subformComponentId: string = subformPdfConfig?.subformComponentId ?? '';
  const subformDataTypeId: string = subformPdfConfig?.subformDataTypeId ?? '';
  const filenameTextResourceId: string = subformPdfConfig?.filenameTextResourceKey?.value ?? '';

  const updateConfig = (studioModeler: StudioModeler, properties: object): void => {
    if (taskExtension.subformPdfConfig) {
      studioModeler.updateModdleProperties(properties, taskExtension.subformPdfConfig);
    } else {
      studioModeler.updateModdleProperties(
        { subformPdfConfig: studioModeler.createElement(SUBFORM_PDF_CONFIG_TYPE, properties) },
        taskExtension,
      );
    }
    forceReRenderComponent();
  };

  const setSubformComponentAndDataTypeIds = (
    newSubformComponentId: string,
    newSubformDataTypeId: string,
  ): void => {
    const isUnchanged =
      newSubformComponentId === subformComponentId && newSubformDataTypeId === subformDataTypeId;
    if (isUnchanged) return;
    updateConfig(new StudioModeler(bpmnDetails.element), {
      subformComponentId: newSubformComponentId || undefined,
      subformDataTypeId: newSubformDataTypeId || undefined,
    });
  };

  const setSubformDataTypeId = (newSubformDataTypeId: string): void => {
    if (newSubformDataTypeId === subformDataTypeId) return;
    updateConfig(new StudioModeler(bpmnDetails.element), {
      subformDataTypeId: newSubformDataTypeId || undefined,
    });
  };

  const setFilenameTextResourceId = (textResourceId: string): void => {
    if (textResourceId === filenameTextResourceId) return;
    const studioModeler = new StudioModeler(bpmnDetails.element);
    updateConfig(studioModeler, {
      filenameTextResourceKey: textResourceId
        ? studioModeler.createElement(FILENAME_TEXT_RESOURCE_KEY_TYPE, { value: textResourceId })
        : undefined,
    });
  };

  return {
    subformComponentId,
    subformDataTypeId,
    filenameTextResourceId,
    setSubformComponentAndDataTypeIds,
    setSubformDataTypeId,
    setFilenameTextResourceId,
  };
};
