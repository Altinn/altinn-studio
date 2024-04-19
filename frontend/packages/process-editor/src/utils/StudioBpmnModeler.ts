import BpmnModeler from 'bpmn-js/lib/Modeler';
import SupportedPaletteProvider from '../bpmnProviders/SupportedPaletteProvider';
import SupportedContextPadProvider from '../bpmnProviders/SupportedContextPadProvider';
import { altinnCustomTasks } from '../extensions/altinnCustomTasks';

export class StudioBpmnModeler {
  private static instance: BpmnModeler | null = null;

  // Need to create a new modelerInstance in order to get the updated
  // canvasContainer when switching between tabs in Studio
  public static getInstance(canvasContainer: HTMLDivElement): BpmnModeler {
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
    return StudioBpmnModeler.instance;
  }
}
