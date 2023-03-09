import { useAppSelector } from 'src/common/hooks/useAppSelector';
import type { IFormData } from 'src/features/form/data';
import type { IAttachment, IAttachments } from 'src/shared/resources/attachments';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export function extractListFromBinding(formData: IFormData, listBinding: string): string[] {
  return Object.keys(formData)
    .filter((key) => key.startsWith(listBinding))
    .map((key) => formData[key]);
}

export function attachmentsFromUuids(componentId: string, uuids: string[], attachments: IAttachments): IAttachment[] {
  if (!uuids.length) {
    return [];
  }

  const attachmentsForComponent = attachments[componentId];
  if (!attachmentsForComponent) {
    return [];
  }

  const componentAttachments: IAttachment[] = [];
  for (const uuid of uuids) {
    const foundAttachment = attachmentsForComponent.find((a) => a.id === uuid);
    if (foundAttachment?.name) {
      componentAttachments.push(foundAttachment);
    }
  }

  return componentAttachments;
}

export function attachmentsFromComponentId(componentId: string, attachments: IAttachments): IAttachment[] {
  const foundAttachments = attachments[componentId];
  if (foundAttachments) {
    return foundAttachments.filter((a) => !!a.name);
  }

  return [];
}

export function useUploaderSummaryData(node: LayoutNodeFromType<'FileUpload' | 'FileUploadWithTag'>): IAttachment[] {
  const formData = useAppSelector((state) => state.formData.formData);
  const attachments = useAppSelector((state) => state.attachments.attachments);

  const listBinding = node.item.dataModelBindings?.list;
  if (listBinding) {
    const values = extractListFromBinding(formData, listBinding);
    return attachmentsFromUuids(node.item.id, values, attachments);
  }

  return attachmentsFromComponentId(node.item.id, attachments);
}
