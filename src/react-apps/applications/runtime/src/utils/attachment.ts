import { IAttachments } from '../shared/resources/attachments';
import { IData } from './../../../shared/src/types';

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
          name: element.fileName,
          size: element.fileSize,
          id: element.id,
        },
      );
    });

  return attachments;
}
