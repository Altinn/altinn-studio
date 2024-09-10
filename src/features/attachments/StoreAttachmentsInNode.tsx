import React, { useRef } from 'react';

import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import {
  GeneratorCondition,
  GeneratorStages,
  NodesStateQueue,
  StageEvaluateExpressions,
} from 'src/utils/layout/generator/GeneratorStages';
import { useNodeFormData } from 'src/utils/layout/useNodeItem';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IAttachment } from 'src/features/attachments/index';
import type { CompWithBehavior } from 'src/layout/layout';
import type { IData } from 'src/types/shared';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function StoreAttachmentsInNode() {
  return (
    <GeneratorCondition
      stage={StageEvaluateExpressions}
      mustBeAdded='parent'
    >
      <PerformWork />
    </GeneratorCondition>
  );
}

function PerformWork() {
  const node = GeneratorInternal.useParent() as LayoutNode<CompWithBehavior<'canHaveAttachments'>>;
  const setNodeProp = NodesStateQueue.useSetNodeProp();
  const attachments = useNodeAttachments();

  GeneratorStages.EvaluateExpressions.useEffect(() => {
    setNodeProp({ node, prop: 'attachments', value: attachments });
  }, [node, setNodeProp, attachments]);

  return null;
}

function useNodeAttachments(): Record<string, IAttachment> {
  const node = GeneratorInternal.useParent() as LayoutNode<CompWithBehavior<'canHaveAttachments'>>;
  const nodeData = useNodeFormData(node);

  const { overriddenTaskId } = useTaskStore(({ overriddenTaskId }) => ({
    overriddenTaskId,
  }));

  const application = useApplicationMetadata();
  const currentTask = useLaxProcessData()?.currentTask?.elementId;
  const data = useLaxInstanceData()?.data;

  const mappedAttachments = useMemoDeepEqual(() => {
    const taskId = overriddenTaskId ? overriddenTaskId : currentTask;

    return mapAttachments(node, data ?? [], application, taskId, nodeData);
  }, [node, data, application, currentTask, nodeData, overriddenTaskId]);

  const prevAttachments = useRef<Record<string, IAttachment>>({});
  return useMemoDeepEqual(() => {
    const prevResult = prevAttachments.current ?? new Map<string, IAttachment>();
    const result: Record<string, IAttachment> = {};

    for (const attachment of mappedAttachments) {
      result[attachment.id] = {
        uploaded: true,
        updating: prevResult[attachment.id]?.updating ?? false,
        deleting: prevResult[attachment.id]?.deleting ?? false,
        data: attachment,
      };
    }

    prevAttachments.current = result;
    return result;
  }, [mappedAttachments]);
}

function mapAttachments(
  node: LayoutNode,
  dataElements: IData[],
  application: ApplicationMetadata,
  currentTask: string | undefined,
  formData: IComponentFormData<CompWithBehavior<'canHaveAttachments'>>,
): IData[] {
  const attachments: IData[] = [];
  for (const data of dataElements) {
    if (data.dataType && node.baseId !== data.dataType) {
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

    const nodeIsInRepeatingGroup = node.id !== node.baseId;
    if (!simpleValue && !listValue && !nodeIsInRepeatingGroup) {
      // We can safely assume the attachment belongs to this node.
      attachments.push(data);
    }
  }

  return attachments;
}
