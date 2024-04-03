import Modeler from 'bpmn-js/lib/Modeler';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import SupportedPaletteProvider from '../bpmnProviders/SupportedPaletteProvider';
import SupportedContextPadProvider from '../bpmnProviders/SupportedContextPadProvider';
import { altinnCustomTasks } from '../extensions/altinnCustomTasks';

export class StudioBpmnModeler {
  private static instance: Modeler | null = null;

  // Singleton pattern to ensure only one instance of the WSConnector is created
  public static getInstance(canvasContainer: HTMLDivElement): Modeler {
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
