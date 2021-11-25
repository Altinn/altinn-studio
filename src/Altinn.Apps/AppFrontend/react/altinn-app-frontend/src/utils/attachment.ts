import { IData } from 'altinn-shared/types';
import { IAttachments } from '../shared/resources/attachments';

export function mapAttachmentListToAttachments(data: IData[], defaultElementId: string): IAttachments {
  const attachments: IAttachments = {};

  data.forEach((element: IData) => {
    if (element.id === defaultElementId || element.dataType === 'ref-data-as-pdf') {
      return;
    }

    if (!attachments[element.dataType]) {
      attachments[element.dataType] = [];
    }

    attachments[element.dataType].push(
      {
        uploaded: true,
        deleting: false,
        updating: false,
        name: element.filename,
        size: element.size,
        tags: element.tags,
        id: element.id,
      },
    );
  });
  return attachments;
}

export function getFileEnding(filename: string): string {
  if (!filename) {
    return '';
  }
  const split: string[] = filename.split('.');
  if (split.length === 1) {
    return '';
  }
  return `.${split[split.length - 1]}`;
}

export function removeFileEnding(filename: string): string {
  if (!filename) {
    return '';
  }
  const split: string[] = filename.split('.');
  if (split.length === 1) {
    return filename;
  }
  return filename.replace(`.${split[split.length - 1]}`, '');
}
