import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
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

/** Imported tasks can omit subformPdfConfig. */
export const useSubformPdfConfig = (): UseSubformPdfConfigResult => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const modeling = modelerRef.current.get<Modeling>('modeling');
  const moddle = modelerRef.current.get<Moddle>('moddle');

  const taskExtension: ModdleElement | undefined = TaskUtils.getTaskExtension(bpmnDetails?.element);
  const subformPdfConfig: ModdleElement | undefined = taskExtension?.subformPdfConfig;

  const subformComponentId: string = subformPdfConfig?.subformComponentId ?? '';
  const subformDataTypeId: string = subformPdfConfig?.subformDataTypeId ?? '';
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

  const setSubformComponentAndDataTypeIds = (
    newSubformComponentId: string,
    newSubformDataTypeId: string,
  ): void => {
    const isUnchanged =
      newSubformComponentId === subformComponentId && newSubformDataTypeId === subformDataTypeId;
    if (isUnchanged) return;
    updateConfig({
      subformComponentId: newSubformComponentId || undefined,
      subformDataTypeId: newSubformDataTypeId || undefined,
    });
  };

  const setSubformDataTypeId = (newSubformDataTypeId: string): void => {
    if (newSubformDataTypeId === subformDataTypeId) return;
    updateConfig({
      subformDataTypeId: newSubformDataTypeId || undefined,
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
    subformComponentId,
    subformDataTypeId,
    filenameTextResourceId,
    setSubformComponentAndDataTypeIds,
    setSubformDataTypeId,
    setFilenameTextResourceId,
  };
};
