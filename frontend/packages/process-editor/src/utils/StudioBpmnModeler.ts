import BpmnModeler from 'bpmn-js/lib/Modeler';
import SupportedPaletteProvider from '../bpmnProviders/SupportedPaletteProvider';
import SupportedContextPadProvider from '../bpmnProviders/SupportedContextPadProvider';
import { altinnCustomTasks } from '../extensions/altinnCustomTasks';

export class StudioBpmnModeler {
  private static instance: BpmnModeler | null = null;

  // Singleton pattern to ensure only one instance of the WSConnector is created
  public static getInstance(canvasContainer: HTMLDivElement): BpmnModeler {
    if (!StudioBpmnModeler.instance) {
      StudioBpmnModeler.instance = new BpmnModeler({
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
    return StudioBpmnModeler.instance;
  }
}
