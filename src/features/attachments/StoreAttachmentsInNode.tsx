import React, { useEffect } from 'react';

import deepEqual from 'fast-deep-equal';

import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { isAttachmentUploaded } from 'src/features/attachments/index';
import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData/types';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLaxInstanceDataElements } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { NodesStateQueue } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorCondition, StageFormValidation } from 'src/utils/layout/generator/GeneratorStages';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useFormDataFor } from 'src/utils/layout/useNodeItem';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IAttachment } from 'src/features/attachments/index';
import type { IDataModelBindingsList, IDataModelBindingsSimple } from 'src/layout/common.generated';
import type { CompWithBehavior } from 'src/layout/layout';
import type { IData } from 'src/types/shared';
import type { IComponentFormData } from 'src/utils/formComponentUtils';

type AttachmentRecord = Record<string, IAttachment>;

export function StoreAttachmentsInNode() {
  return (
    <GeneratorCondition
      stage={StageFormValidation}
      mustBeAdded='parent'
    >
      <StoreAttachmentsInNodeWorker />
    </GeneratorCondition>
  );
}

function isNode(parent: ReturnType<typeof GeneratorInternal.useParent>): parent is {
  type: 'node';
  baseId: string;
  indexedId: string;
} {
  return parent?.type === 'node' && !!parent.baseId && !!parent.indexedId;
}

function StoreAttachmentsInNodeWorker() {
  const parent = GeneratorInternal.useParent();
  if (!isNode(parent)) {
    throw new Error('StoreAttachmentsInNodeWorker must be used inside a node');
  }
  const item = GeneratorInternal.useIntermediateItem();
  const attachments = useNodeAttachments();
  const errors = NodesInternal.useNodeErrors(parent.indexedId);
  const hasErrors = errors && Object.values(errors).length > 0;

  const hasBeenSet = NodesInternal.useNodeData(parent.indexedId, undefined, (data) =>
    deepEqual('attachments' in data ? data.attachments : undefined, attachments),
  );
  NodesStateQueue.useSetNodeProp({ nodeId: parent.indexedId, prop: 'attachments', value: attachments }, !hasBeenSet);

  if (hasErrors) {
    // If there are errors, we don't want to run the effects. It could be the case that multiple FileUpload components
    // have been bound to the same path in the data model, which could cause infinite loops in the components below
    // when they try to manage the same binding.
    return null;
  }

  // When the backend deletes an attachment, we might need to update the data model and remove the attachment ID from
  // there (if the backend didn't do so already). This is done by these `Maintain*DataModelBinding` components.
  const dataModelBindings = item?.dataModelBindings as IDataModelBindingsSimple | IDataModelBindingsList | undefined;
  return dataModelBindings && 'list' in dataModelBindings && dataModelBindings.list ? (
    <MaintainListDataModelBinding
      bindings={dataModelBindings}
      attachments={attachments}
    />
  ) : dataModelBindings && 'simpleBinding' in dataModelBindings && dataModelBindings.simpleBinding ? (
    <MaintainSimpleDataModelBinding
      bindings={dataModelBindings}
      attachments={attachments}
    />
  ) : null;
}

function useNodeAttachments(): AttachmentRecord {
  const parent = GeneratorInternal.useParent();
  if (!isNode(parent)) {
    throw new Error('useNodeAttachments must be used inside a node');
  }
  const { indexedId, baseId } = parent;
  const nodeData = useFormDataFor(baseId) as IComponentFormData<CompWithBehavior<'canHaveAttachments'>>;

  const overriddenTaskId = useTaskStore((state) => state.overriddenTaskId);

  const application = useApplicationMetadata();
  const currentTask = useProcessQuery().data?.currentTask?.elementId;
  const data = useLaxInstanceDataElements(baseId);

  const mappedAttachments = useMemoDeepEqual(() => {
    const taskId = overriddenTaskId ? overriddenTaskId : currentTask;

    return mapAttachments(indexedId, baseId, data, application, taskId, nodeData);
  }, [indexedId, baseId, data, application, currentTask, nodeData, overriddenTaskId]);

  const prev = NodesInternal.useNodeData(indexedId, undefined, (data) =>
    'attachments' in data ? data.attachments : undefined,
  );

  return useMemoDeepEqual(() => {
    const result: Record<string, IAttachment> = {};

    for (const attachment of mappedAttachments) {
      const prevStored = prev?.[attachment.id];
      result[attachment.id] = {
        uploaded: true,
        updating: prevStored?.updating || false,
        deleting: prevStored?.deleting || false,
        data: {
          ...attachment,
          tags: prevStored?.data.tags ?? attachment.tags,
        },
      };
    }

    // Find any not-yet uploaded attachments and add them back to the result
    for (const [id, attachment] of Object.entries(prev ?? {})) {
      if (!result[id] && !isAttachmentUploaded(attachment)) {
        result[id] = attachment;
      }
    }

    return result;
  }, [mappedAttachments, prev]);
}

function mapAttachments(
  nodeId: string,
  baseId: string,
  dataElements: IData[],
  application: ApplicationMetadata,
  currentTask: string | undefined,
  formData: IComponentFormData<CompWithBehavior<'canHaveAttachments'>>,
): IData[] {
  const attachments: IData[] = [];
  for (const data of dataElements) {
    if (data.dataType && baseId !== data.dataType) {
      // The attachment does not belong to this node
      continue;
    }

    const dataType = application.dataTypes.find((dt) => dt.id === data.dataType);
    if (!dataType) {
      continue;
    }

    if (dataType.taskId && dataType.taskId !== currentTask) {
      continue;
    }

    if (dataType.appLogic?.classRef) {
      // Data models are not attachments
      continue;
    }

    if (dataType.id === 'ref-data-as-pdf') {
      // Generated PDF receipts are not attachments
      continue;
    }

    const simpleValue = formData && 'simpleBinding' in formData ? formData.simpleBinding : undefined;
    const listValue = formData && 'list' in formData ? formData.list : undefined;

    if (simpleValue && simpleValue === data.id) {
      attachments.push(data);
      continue;
    }

    if (listValue && Array.isArray(listValue) && listValue.some((binding) => binding === data.id)) {
      attachments.push(data);
      continue;
    }

    const nodeIsInRepeatingGroup = nodeId !== baseId;
    if (!simpleValue && !listValue && !nodeIsInRepeatingGroup) {
      // We can safely assume the attachment belongs to this node.
      attachments.push(data);
    }
  }

  return attachments;
}

interface MaintainBindingsProps {
  attachments: AttachmentRecord;
}

interface MaintainListDataModelBindingProps extends MaintainBindingsProps {
  bindings: IDataModelBindingsList;
}

interface MaintainSimpleDataModelBindingProps extends MaintainBindingsProps {
  bindings: IDataModelBindingsSimple;
}

/**
 * @see useSetAttachmentInDataModel
 */
function MaintainListDataModelBinding({ bindings, attachments }: MaintainListDataModelBindingProps) {
  const { formData, setValue } = useDataModelBindings(bindings, DEFAULT_DEBOUNCE_TIMEOUT, 'raw');

  useEffect(() => {
    const newList = Object.values(attachments)
      .filter(isAttachmentUploaded)
      .map((attachment) => attachment.data.id);

    if (!deepEqual(formData.list, newList) && !empty(formData.list, newList)) {
      setValue('list', newList);
    }
  }, [attachments, formData.list, setValue]);

  return null;
}

/**
 * Checks if two items are practically empty. In that case, we consider them equal. There is no point in setting an
 * empty array in the data model, that just increases the amount of times we have to save the data model.
 */
function empty(a: unknown, b: unknown): boolean {
  const aEmpty = a === undefined || a === null || (Array.isArray(a) && a.length === 0);
  const bEmpty = b === undefined || b === null || (Array.isArray(b) && b.length === 0);
  return aEmpty && bEmpty;
}

/**
 * @see useSetAttachmentInDataModel
 */
function MaintainSimpleDataModelBinding({ bindings, attachments }: MaintainSimpleDataModelBindingProps) {
  const parent = GeneratorInternal.useParent();
  if (!isNode(parent)) {
    throw new Error('MaintainSimpleDataModelBinding must be used inside a node');
  }

  const { formData, setValue } = useDataModelBindings(bindings, DEFAULT_DEBOUNCE_TIMEOUT, 'raw');

  useEffect(() => {
    if (Object.keys(attachments).length > 1) {
      window.logErrorOnce(
        `Node ${parent.baseId} has more than one attachment, but only one is supported with \`dataModelBindings.simpleBinding\``,
      );
      return;
    }

    const firstAttachment = Object.values(attachments)[0];
    if (!firstAttachment && formData.simpleBinding) {
      setValue('simpleBinding', undefined);
    } else if (
      firstAttachment &&
      isAttachmentUploaded(firstAttachment) &&
      formData.simpleBinding !== firstAttachment.data.id
    ) {
      setValue('simpleBinding', firstAttachment.data.id);
    }
  }, [attachments, formData.simpleBinding, parent.baseId, setValue]);

  return null;
}
