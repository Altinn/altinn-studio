export interface IAttachment {
  uploaded: boolean;
  deleting: boolean;
  name: string;
  size: number;
  id: string;
}
export interface IAttachments {
  [attachmentType: string]: IAttachment[];
}

export interface IAttachmentListApiResponse {
  type: string;
  attachments: IAttachmentApiResponse[];
}

export interface IAttachmentApiResponse {
  name: string;
  size: number;
  id: string;
}

export interface IAltinnWindow extends Window {
  org: string;
  service: string;
  instanceId: string;
  reportee: string;
}
