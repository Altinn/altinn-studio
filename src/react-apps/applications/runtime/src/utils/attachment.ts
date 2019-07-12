import { IAttachmentListApiResponse, IAttachments } from '../shared/resources/attachments';

export function mapAttachmentListApiResponseToAttachments(response: IAttachmentListApiResponse[]): IAttachments {
  const attachments: IAttachments = {};
  if (!response) {
    return attachments;
  }
  response.forEach((attachmentsByType: IAttachmentListApiResponse) => {
    if (!attachmentsByType.type) {
      return;
    }
    attachments[attachmentsByType.type] = [];
    if (!attachmentsByType.attachments) {
      return;
    }
    attachmentsByType.attachments.forEach((attachment) => {
      attachments[attachmentsByType.type].push(
        { ...attachment, uploaded: true, deleting: false });
    });
  });
  return attachments;
}
