import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useChecksum } from '../../../../hooks/useChecksum';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';
import { TaskUtils } from '../../../../utils/taskUtils';

const FILENAME_TEXT_RESOURCE_KEY_TYPE = 'altinn:FilenameTextResourceKey';

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
};

/**
 * Reads and writes `<altinn:pdfConfig>` on the selected pdf task.
 *
 * An emptied filename is written as `undefined`, which removes the element instead of leaving
 * behind a blank one, the same removal the subform pdf config uses.
 *
 * The moddle objects behind the config are not reactive, so a write is followed by a checksum bump
 * that re-renders whatever reads from them.
 */
export const usePdfConfig = (): UsePdfConfigResult => {
  const { bpmnDetails } = useBpmnContext();
  const { updateChecksum: forceReRenderComponent } = useChecksum();

  const pdfConfig: PdfConfig = TaskUtils.getTaskExtension(bpmnDetails?.element)?.pdfConfig ?? {};

  const storedFilenameTextResourceId = pdfConfig.filenameTextResourceKey?.value ?? '';

  const updateFilenameTextResourceKey = (textResourceId: string): void => {
    if (textResourceId === storedFilenameTextResourceId) return;

    const studioModeler = new StudioModeler(bpmnDetails.element);

    studioModeler.updateModdleProperties(
      {
        filenameTextResourceKey: textResourceId
          ? studioModeler.createElement(FILENAME_TEXT_RESOURCE_KEY_TYPE, { value: textResourceId })
          : undefined,
      },
      pdfConfig,
    );

    forceReRenderComponent();
  };

  return {
    pdfConfig,
    storedFilenameTextResourceId,
    updateFilenameTextResourceKey,
  };
};
