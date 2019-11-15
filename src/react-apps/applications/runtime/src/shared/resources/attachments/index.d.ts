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

export interface IAltinnWindow extends Window {
  org: string;
  app: string;
  instanceId: string;
  reportee: string;
}

export interface IDataElement {
  contentType: string;
  createdBy: number;
  createdDateTime: string;
  dataLinks: object;
  elementType: string;
  fileName: string;
  fileSize: number;
  id: string;
  isLocked: boolean;
  lastChangedBy: string;
  lastChangedDateTime: string;
  storageUrl: string;
}
