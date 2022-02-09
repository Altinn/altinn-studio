export interface IAttachment {
  uploaded: boolean;
  updating: boolean;
  deleting: boolean;
  name: string;
  size: number;
  tags: string[];
  id: string;
}
export interface IAttachments {
  [attachmentType: string]: IAttachment[];
}
