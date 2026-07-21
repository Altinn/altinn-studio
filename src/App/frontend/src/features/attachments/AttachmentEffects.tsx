import { useEffect } from 'react';

import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { type AttachmentNode, isCanonicalAttachmentData } from 'src/features/attachments/tools';
import { FormStore } from 'src/features/form/FormContext';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { getComponentBehaviors } from 'src/layout';
import { deriveRuntimeNodeRefs } from 'src/utils/layout/deriveRuntimeNodeRefs';
import { getIndexedDataModelBindings } from 'src/utils/layout/rowContext';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IData } from 'src/types/shared';

type BindingEntry = {
  kind: 'list' | 'simpleBinding';
  node: AttachmentNode;
  reference: IDataModelReference;
};

type AttachmentEffectsSnapshot = {
  readOnly: boolean;
  bindings: BindingEntry[];
  currentValues: Record<string, unknown>;
};

const emptyArray = [];

/**
 * Removes attachment IDs left in uploader bindings after the backend has
 * deleted the corresponding data element.
 */
export function AttachmentEffects() {
  const snapshot = FormStore.raw.useMemoSelector(makeAttachmentEffectsSnapshot);
  const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;
  const taskId = useProcessTaskId();
  const setLeafValue = FormStore.data.useSetLeafValue();
  const debounce = FormStore.data.useDebounceImmediately();

  useEffect(() => {
    if (snapshot.readOnly) {
      return;
    }

    const application = getApplicationMetadata();
    const bindings = snapshot.bindings;
    const conflicts = findConflictingBindings(bindings);
    let changed = false;

    for (const binding of bindings) {
      const key = getBindingKey(binding.reference);
      if (conflicts.has(key)) {
        continue;
      }

      const currentValue = snapshot.currentValues[key];
      const uploadedIds = selectCurrentCanonicalAttachmentIds(
        binding.node,
        currentValue,
        instanceData,
        application,
        taskId,
      );

      if (binding.kind === 'list' && Array.isArray(currentValue)) {
        const nextValue = currentValue.filter((value) => typeof value === 'string' && uploadedIds.has(value));
        if (!deepEqual(nextValue, currentValue) && !bothEmpty(nextValue, currentValue)) {
          setLeafValue({ reference: binding.reference, newValue: nextValue });
          changed = true;
        }
      } else if (
        binding.kind === 'simpleBinding' &&
        typeof currentValue === 'string' &&
        !uploadedIds.has(currentValue)
      ) {
        setLeafValue({ reference: binding.reference, newValue: undefined });
        changed = true;
      }
    }

    if (changed) {
      debounce('listChanges');
    }
  }, [debounce, instanceData, setLeafValue, snapshot, taskId]);

  return null;
}

function makeAttachmentEffectsSnapshot(state: FormStoreState): AttachmentEffectsSnapshot {
  const bindings = getUploaderBindings(state);
  return {
    readOnly: state.readOnly,
    bindings,
    currentValues: Object.fromEntries(
      bindings.map((binding) => [
        getBindingKey(binding.reference),
        dot.pick(binding.reference.field, state.data.models[binding.reference.dataType]?.currentData),
      ]),
    ),
  };
}

function getUploaderBindings(state: FormStoreState): BindingEntry[] {
  const bindings: BindingEntry[] = [];
  for (const nodeRef of deriveRuntimeNodeRefs(state)) {
    const component = state.bootstrap.layoutLookups.getComponent(nodeRef.baseId);
    if (!getComponentBehaviors(component.type)?.canHaveAttachments) {
      continue;
    }

    const node: AttachmentNode = {
      id: nodeRef.id,
      baseId: nodeRef.baseId,
      dataModelBindings: getIndexedDataModelBindings(
        component.dataModelBindings,
        nodeRef.rowContexts,
      ) as AttachmentNode['dataModelBindings'],
    };
    const dataModelBindings = node.dataModelBindings;
    if (dataModelBindings && 'list' in dataModelBindings && dataModelBindings.list) {
      bindings.push({ kind: 'list', node, reference: dataModelBindings.list });
    } else if (dataModelBindings && 'simpleBinding' in dataModelBindings && dataModelBindings.simpleBinding) {
      bindings.push({ kind: 'simpleBinding', node, reference: dataModelBindings.simpleBinding });
    }
  }
  return bindings;
}

function selectCurrentCanonicalAttachmentIds(
  node: AttachmentNode,
  currentValue: unknown,
  instanceData: IData[],
  application: ApplicationMetadata,
  taskId?: string,
): Set<string> {
  const candidateIds = getCurrentAttachmentIds(currentValue);
  if (candidateIds.size === 0) {
    return candidateIds;
  }

  const uploadedIds = new Set<string>();
  for (const data of instanceData) {
    if (candidateIds.has(data.id) && isCanonicalAttachmentData(data, node, application, taskId)) {
      uploadedIds.add(data.id);
    }
  }
  return uploadedIds;
}

function getCurrentAttachmentIds(currentValue: unknown): Set<string> {
  const ids = new Set<string>();
  if (typeof currentValue === 'string') {
    ids.add(currentValue);
  } else if (Array.isArray(currentValue)) {
    for (const value of currentValue) {
      if (typeof value === 'string') {
        ids.add(value);
      }
    }
  }
  return ids;
}

function findConflictingBindings(bindings: BindingEntry[]): Set<string> {
  const nodesByBinding = new Map<string, string[]>();
  for (const binding of bindings) {
    const key = getBindingKey(binding.reference);
    const nodeIds = nodesByBinding.get(key);
    if (nodeIds) {
      nodeIds.push(binding.node.id);
    } else {
      nodesByBinding.set(key, [binding.node.id]);
    }
  }

  const conflicts = new Set<string>();
  for (const [key, nodeIds] of nodesByBinding) {
    if (nodeIds.length > 1) {
      conflicts.add(key);
      window.logErrorOnce(`Attachment binding '${key}' is used by multiple uploader nodes: ${nodeIds.join(', ')}`);
    }
  }
  return conflicts;
}

function getBindingKey(reference: IDataModelReference): string {
  return `${reference.dataType}:${reference.field}`;
}

function bothEmpty(a: unknown, b: unknown): boolean {
  const isEmpty = (value: unknown) =>
    value === undefined || value === null || (Array.isArray(value) && value.length === 0);
  return isEmpty(a) && isEmpty(b);
}
