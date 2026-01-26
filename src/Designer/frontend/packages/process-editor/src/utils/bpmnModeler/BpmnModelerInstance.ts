import BpmnModeler from 'bpmn-js/lib/Modeler';
import SupportedPaletteProvider from '../../bpmnProviders/SupportedPaletteProvider';
import SupportedContextPadProvider from '../../bpmnProviders/SupportedContextPadProvider';
import CustomTranslateModule from '../../bpmnProviders/CustomTranslateModule';
import { altinnCustomTasks } from '../../extensions/altinnCustomTasks';
import UpdateTaskIdCommandHandler from '@altinn/process-editor/commandHandlers/UpdateTaskIdCommandHandler';

// Module-level variable to store the app library version for access by bpmn-js modules
let currentAppLibVersion: string | null = null;

export const getAppLibVersion = (): string | null => currentAppLibVersion;

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
  public static getInstance(canvasContainer?: HTMLDivElement, appLibVersion?: string): BpmnModeler {
    if (appLibVersion) {
      currentAppLibVersion = appLibVersion;
    }

    const shouldCreateNewInstance =
      !BpmnModelerInstance.instance && BpmnModelerInstance.currentRefContainer !== canvasContainer;

    if (shouldCreateNewInstance) {
      BpmnModelerInstance.instance = new BpmnModeler({
        container: canvasContainer,
        additionalModules: [
          SupportedPaletteProvider,
          SupportedContextPadProvider,
          UpdateTaskIdCommandHandler,
          CustomTranslateModule,
        ],
        moddleExtensions: {
          altinn: altinnCustomTasks,
        },
      });
    }
    BpmnModelerInstance.currentRefContainer = canvasContainer;
    return BpmnModelerInstance.instance;
  }
}
