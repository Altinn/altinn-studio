import { IAttachments } from '../shared/resources/attachments';
import { IData } from './../../../shared/src/types';

export function mapAttachmentListToAttachments(data: IData[]): IAttachments {
  const attachments: IAttachments = {};

  data.forEach((element: IData) => {
      if (element.elementType === 'default' || element.elementType === 'ref-data-as-pdf') {
        return;
      }

      if (!attachments[element.elementType]) {
        attachments[element.elementType] = [];
      }

      attachments[element.elementType].push(
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
