import BpmnModeler from 'bpmn-js/lib/Modeler';
import SupportedPaletteProvider from '../../bpmnProviders/SupportedPaletteProvider';
import SupportedContextPadProvider from '../../bpmnProviders/SupportedContextPadProvider';
import { altinnCustomTasks } from '../../extensions/altinnCustomTasks';

export class BpmnModelerInstance {
  private static instance: BpmnModeler | null = null;

  // Singleton pattern to ensure only one instance of the StudioBpmnModeler is created
  public static getInstance(canvasContainer?: HTMLDivElement): BpmnModeler {
    if (!BpmnModelerInstance.instance) {
      BpmnModelerInstance.instance = new BpmnModeler({
        container: canvasContainer,
        keyboard: {
          bindTo: document,
        },
        additionalModules: [SupportedPaletteProvider, SupportedContextPadProvider],
        moddleExtensions: {
          altinn: altinnCustomTasks,
        },
      });
    }
    return BpmnModelerInstance.instance;
  }
}
