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
