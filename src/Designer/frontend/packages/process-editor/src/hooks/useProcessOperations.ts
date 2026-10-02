import { useRef, useState } from 'react';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type Selection from 'diagram-js/lib/features/selection/Selection';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { ProcessState } from 'app-shared/types/api/ProcessState';
import type { TaskIdChange } from 'app-shared/types/BpmnMetadataForm';
import { useBpmnContext } from '../contexts/BpmnContext';
import type { BpmnApiContextProps } from '../contexts/BpmnApiContext';
import {
  ProcessChangeQueue,
  type ProcessSaveStatus,
  type QueuedProcessChange,
} from '../utils/ProcessChangeQueue';
import type { ReadOnlyCommandStack } from '../utils/bpmnModeler/ReadOnlyCommandStack';
import { useProcessChangeMutation, useRefreshProcessDependencies } from './useProcessState';

type Props = {
  initialState: ProcessState;
  org: string;
  app: string;
  load: () => Promise<ProcessState>;
};

type ProcessOperations = Pick<
  BpmnApiContextProps,
  | 'saveBpmn'
  | 'addLayoutSet'
  | 'deleteLayoutSet'
  | 'mutateLayoutSetId'
  | 'mutateDataTypes'
  | 'saveSubformPdfComponent'
> & {
  status: ProcessSaveStatus;
  retry: () => void;
  discard: () => Promise<void>;
};

type ChangeContent = QueuedProcessChange['content'];

export function useProcessOperations({ initialState, org, app, load }: Props): ProcessOperations {
  const { modelerRef, setBpmnDetails, isReloadingRef } = useBpmnContext();
  const { mutateAsync: save } = useProcessChangeMutation(org, app);
  const refresh = useRefreshProcessDependencies(org, app);
  const latest = useRef({ save, load, refresh });
  latest.current = { save, load, refresh };
  const [status, setStatus] = useState<ProcessSaveStatus>({
    pending: false,
    editingBlocked: false,
  });
  const queueRef = useRef<ProcessChangeQueue>(undefined);
  if (!queueRef.current) {
    queueRef.current = new ProcessChangeQueue(initialState, {
      save: (change) => latest.current.save(change),
      load: () => latest.current.load(),
      onStatusChange: (nextStatus) => {
        const commandStack = modelerRef.current?.get<ReadOnlyCommandStack>('commandStack');
        if (commandStack) commandStack.readOnly = nextStatus.editingBlocked;
        setStatus(nextStatus);
      },
      importState: async (state, change) => {
        await latest.current.refresh();
        const modeler = modelerRef.current;
        if (!modeler) throw new Error('Modeler not initialized');
        const selection = modeler.get<Selection>('selection');
        const selectedId = getIdAfterRename(selection.get()[0]?.id, change);
        const canvas = modeler.get<Canvas>('canvas');
        const viewbox = canvas.viewbox();
        setBpmnDetails(null);
        // Ignore modeler events while importing the saved diagram.
        isReloadingRef.current = true;
        try {
          await modeler.importXML(state.bpmnXml);
          canvas.viewbox(viewbox);
        } finally {
          isReloadingRef.current = false;
        }
        const selectedElement =
          selectedId && modeler.get<ElementRegistry>('elementRegistry').get(selectedId);
        if (selectedElement) selection.select(selectedElement);
      },
    });
  }
  const queue = queueRef.current;

  const enqueue = (change: QueuedProcessChange, canChangeDependencies: boolean): boolean =>
    queue.enqueue({
      ...change,
      onSuccess: (imported) => {
        if (canChangeDependencies && !imported) {
          void latest.current.refresh();
        }
        change.onSuccess?.(imported);
      },
    });

  return {
    status,
    retry: () => queue.retry(),
    discard: () => queue.discard(),
    saveBpmn: (xml, metadata, options) =>
      enqueue(
        { content: metadata ? { metadata } : {}, xml, ...options },
        Boolean(metadata) || Boolean(options?.addsOrRemovesTasks),
      ),
    addLayoutSet: (layoutSetCreation, options) =>
      enqueue({ content: { layoutSetCreation }, onSuccess: options?.onSuccess }, true),
    deleteLayoutSet: (layoutSetDeletion) => enqueue({ content: { layoutSetDeletion } }, true),
    mutateLayoutSetId: (layoutSetRename, options) =>
      enqueue({ content: { layoutSetRename }, onSuccess: options?.onSuccess }, true),
    mutateDataTypes: (dataTypesChange, options) =>
      enqueue({ content: { dataTypesChange }, onSuccess: options?.onSuccess }, true),
    saveSubformPdfComponent: (subformPdfComponentChange) =>
      enqueue({ content: { metadata: { subformPdfComponentChange } } }, true),
  };
}

function getIdAfterRename(id: string | undefined, change?: ChangeContent): string | undefined {
  const rename: TaskIdChange | undefined =
    change?.metadata?.taskIdChange ??
    (change?.layoutSetRename && {
      oldId: change.layoutSetRename.layoutSetIdToUpdate,
      newId: change.layoutSetRename.newLayoutSetId,
    });
  return rename && id === rename.oldId ? rename.newId : id;
}
