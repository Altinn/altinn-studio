import BpmnModeler from 'bpmn-js/lib/Modeler';
import SupportedPaletteProvider from '../../bpmnProviders/SupportedPaletteProvider';
import SupportedContextPadProvider from '../../bpmnProviders/SupportedContextPadProvider';
import { altinnCustomTasks } from '../../extensions/altinnCustomTasks';

export class BpmnModelerInstance {
  private static instance: BpmnModeler | null = null;
  private static currentRefContainer = null;

  public static destroyInstance(): void {
    if (BpmnModelerInstance.instance) {
      BpmnModelerInstance.instance.detach();
      BpmnModelerInstance.instance = null;
    }
  }

  // Singleton pattern to ensure only one instance of the StudioBpmnModeler is created
  public static getInstance(canvasContainer?: HTMLDivElement): BpmnModeler {
    const shouldCreateNewInstance =
      !BpmnModelerInstance.instance && BpmnModelerInstance.currentRefContainer !== canvasContainer;

    if (shouldCreateNewInstance) {
      BpmnModelerInstance.instance = new BpmnModeler({
        container: canvasContainer,
        additionalModules: [SupportedPaletteProvider, SupportedContextPadProvider],
        moddleExtensions: {
          altinn: altinnCustomTasks,
        },
      });
    }
    BpmnModelerInstance.currentRefContainer = canvasContainer;
    return BpmnModelerInstance.instance;
  }
}
