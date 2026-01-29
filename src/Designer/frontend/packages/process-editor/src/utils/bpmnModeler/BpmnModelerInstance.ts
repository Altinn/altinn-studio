import BpmnModeler from 'bpmn-js/lib/Modeler';
import SupportedPaletteProvider from '../../bpmnProviders/SupportedPaletteProvider';
import SupportedContextPadProvider from '../../bpmnProviders/SupportedContextPadProvider';
import { altinnCustomTasks } from '../../extensions/altinnCustomTasks';
import UpdateTaskIdCommandHandler from '@altinn/process-editor/commandHandlers/UpdateTaskIdCommandHandler';
import type { AppVersion } from 'app-shared/types/AppVersion';

type VersionModule = {
  appVersion: ['value', AppVersion];
};

const createVersionModule = (appVersion: AppVersion): VersionModule => ({
  appVersion: ['value', appVersion],
});

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
  public static getInstance(
    canvasContainer?: HTMLDivElement,
    appVersion?: AppVersion,
  ): BpmnModeler {
    const shouldCreateNewInstance =
      !BpmnModelerInstance.instance && BpmnModelerInstance.currentRefContainer !== canvasContainer;

    if (shouldCreateNewInstance) {
      BpmnModelerInstance.instance = new BpmnModeler({
        container: canvasContainer,
        additionalModules: [
          createVersionModule(appVersion),
          SupportedPaletteProvider,
          SupportedContextPadProvider,
          UpdateTaskIdCommandHandler,
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
