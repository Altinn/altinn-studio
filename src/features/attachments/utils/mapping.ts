import { ContextNotProvided } from 'src/core/contexts/context';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { FormDataSelector } from 'src/layout';
import type { IData, IDataType } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

export interface SimpleAttachments {
  [attachmentComponentId: string]: IData[] | undefined;
}

function validNodeType(node: LayoutNode): node is LayoutNode<'FileUpload' | 'FileUploadWithTag'> {
  return node.item.type === 'FileUpload' || node.item.type === 'FileUploadWithTag';
}

function addAttachment(attachments: SimpleAttachments, node: LayoutNode, data: IData) {
  if (!attachments[node.item.id]) {
    attachments[node.item.id] = [];
  }
  attachments[node.item.id]?.push(data);
}

function mapAttachments(
  dataElements: IData[],
  nodes: LayoutPages,
  application: IApplicationMetadata,
  currentTask: string | undefined,
  formDataSelector: FormDataSelector | typeof ContextNotProvided,
): SimpleAttachments {
  const attachments: SimpleAttachments = {};
  const dataTypeMap: { [key: string]: IDataType | undefined } = {};

  for (const dataType of application.dataTypes) {
    dataTypeMap[dataType.id] = dataType;
  }

  for (const data of dataElements) {
    const dataType = dataTypeMap[data.dataType];
    if (!dataType) {
      window.logWarnOnce(`Attachment with id ${data.id} has an unknown dataType: ${data.dataType}`);
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

    const matchingNodes = nodes.findAllById(data.dataType).filter((node) => {
      if (!validNodeType(node)) {
        window.logWarnOnce(
          `Attachment with id ${data.id} indicates it may belong to the component ${node.item.id}, which is ` +
            `not a FileUpload or FileUploadWithTag (it is a ${node.item.type})`,
        );
        return false;
      }
      return true;
    });

    // If there are multiple matching nodes, we need to find the one that has formData matching the attachment ID.
    let found = false;
    for (const node of matchingNodes) {
      const bindings = node.item.dataModelBindings;
      const simpleBinding = bindings && 'simpleBinding' in bindings ? bindings.simpleBinding : undefined;
      const listBinding = bindings && 'list' in bindings ? bindings.list : undefined;
      const simpleValue =
        simpleBinding && formDataSelector !== ContextNotProvided ? formDataSelector(simpleBinding) : undefined;
      const listValue =
        listBinding && formDataSelector !== ContextNotProvided ? formDataSelector(listBinding) : undefined;

      const nodeIsInRepeatingGroup = node
        .parents()
        .some((parent) => parent instanceof BaseLayoutNode && parent.isType('RepeatingGroup'));

      if (simpleValue && simpleValue === data.id) {
        addAttachment(attachments, node, data);
        found = true;
        break;
      }

      if (listValue && Array.isArray(listValue) && listValue.some((binding) => binding === data.id)) {
        addAttachment(attachments, node, data);
        found = true;
        break;
      }

      if (!simpleBinding && !listBinding && !nodeIsInRepeatingGroup && matchingNodes.length === 1) {
        // We can safely assume the attachment belongs to this node.
        addAttachment(attachments, node, data);
        found = true;
        break;
      }
    }

    !found &&
      window.logErrorOnce(
        `Could not find matching component/node for attachment ${data.dataType}/${data.id} (there may be a ` +
          `problem with the mapping of attachments to form data in a repeating group). ` +
          `Traversed ${matchingNodes.length} nodes with id ${data.dataType}`,
      );
  }

  return attachments;
}

/**
 * This hook will map all attachments in the instance data to the nodes in the layout.
 * It will however, not do anything with new attachments that are not yet uploaded as of loading the instance data.
 * Use the `useAttachments` hook for that.
 *
 * @see useAttachments
 */
export function useMappedAttachments() {
  const application = useApplicationMetadata();
  const currentTask = useLaxProcessData()?.currentTask?.elementId;
  const data = useLaxInstanceData()?.data;
  const nodes = useNodes();
  const formDataSelector = FD.useLaxDebouncedSelector();

  return useMemoDeepEqual(() => {
    if (data && nodes && application) {
      return mapAttachments(data, nodes, application, currentTask, formDataSelector);
    }

    return undefined;
  }, [data, nodes, application, currentTask, formDataSelector]);
}
