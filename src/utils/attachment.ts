import { deleteGroupData, getKeyIndex } from 'src/utils/databindings';
import { splitDashedKey } from 'src/utils/formLayout';
import type { IFormData } from 'src/features/form/data';
import type { ILayoutComponent, ILayouts } from 'src/layout/layout';
import type { IAttachments } from 'src/shared/resources/attachments';
import type { IData } from 'src/types/shared';

export function mapAttachmentListToAttachments(
  data: IData[],
  defaultElementId: string | undefined,
  formData: IFormData,
  layouts: ILayouts,
): IAttachments {
  const attachments: IAttachments = {};
  const allComponents = Object.values(layouts).flat();

  data.forEach((element: IData) => {
    const baseComponentId = element.dataType;
    if (element.id === defaultElementId || baseComponentId === 'ref-data-as-pdf') {
      return;
    }

    const component = allComponents.find((c) => c?.id === baseComponentId);
    if (!component || (component.type !== 'FileUpload' && component.type !== 'FileUploadWithTag')) {
      return;
    }

    let [key, index] = convertToDashedComponentId(
      baseComponentId,
      formData,
      element.id,
      component.maxNumberOfAttachments > 1,
    );

    if (!key) {
      key = baseComponentId;
      index = attachments[key]?.length || 0;
    }

    if (!attachments[key]) {
      attachments[key] = [];
    }

    attachments[key][index] = {
      uploaded: true,
      deleting: false,
      updating: false,
      name: element.filename,
      size: element.size,
      tags: element.tags,
      id: element.id,
    };
  });

  return attachments;
}

function convertToDashedComponentId(
  baseComponentId: string,
  formData: IFormData,
  attachmentUuid: string,
  hasIndex: boolean,
): [string, number] {
  const formDataKey = Object.keys(formData).find((key) => formData[key] === attachmentUuid);

  if (!formDataKey) {
    return ['', 0];
  }

  const groups = getKeyIndex(formDataKey);
  let componentId: string;
  let index: number;
  if (hasIndex) {
    const groupSuffix = groups.length > 1 ? `-${groups.slice(0, groups.length - 1).join('-')}` : '';

    componentId = `${baseComponentId}${groupSuffix}`;
    index = groups[groups.length - 1];
  } else {
    const groupSuffix = groups.length ? `-${groups.join('-')}` : '';

    componentId = `${baseComponentId}${groupSuffix}`;
    index = 0;
  }

  return [componentId, index];
}

export function getFileEnding(filename: string | undefined): string {
  if (!filename) {
    return '';
  }
  const split: string[] = filename.split('.');
  if (split.length === 1) {
    return '';
  }
  return `.${split[split.length - 1]}`;
}

export function removeFileEnding(filename: string | undefined): string {
  if (!filename) {
    return '';
  }
  const split: string[] = filename.split('.');
  if (split.length === 1) {
    return filename;
  }
  return filename.replace(`.${split[split.length - 1]}`, '');
}

/**
 * When removing a row in a repeating group, this function shifts attachments bound to later rows upwards. Pass in the
 * groupId and index for the row being deleted.
 */
export function shiftAttachmentRowInRepeatingGroup(
  attachments: IAttachments,
  uploaderComponents: ILayoutComponent[],
  groupId: string,
  index: number,
): IAttachments {
  const result = { ...attachments };
  const splitId = splitDashedKey(groupId);
  const lookForComponents = new Set(uploaderComponents.map((c) => c.id));

  let lastIndex = -1;
  for (const key of Object.keys(attachments)) {
    const thisSplitId = splitDashedKey(key);
    if (lookForComponents.has(thisSplitId.baseComponentId)) {
      lastIndex = Math.max(lastIndex, thisSplitId.depth[splitId.depth.length] || -1);
    }
  }

  for (let laterIdx = index + 1; laterIdx <= lastIndex; laterIdx++) {
    for (const componentId of lookForComponents) {
      deleteGroupData(result, componentId + splitId.stringDepthWithLeadingDash, laterIdx, false, true);
    }
  }

  return result;
}

export const AsciiUnitSeparator = String.fromCharCode(31); // Used to separate units within a string.
