import { IAttachment } from './../types/index';

interface IData {
  id: string;
  elementType: string;
  fileName: string;
  contentType: string;
  storageUrl: string;
  dataLinks: IDataLinks;
  fileSize: number;
  isLocked: boolean;
  createdDateTime: Date;
  lastChangedDateTime: Date;
}

interface IDataLinks {
  apps: string;
}

export const returnInstanceAttachments = (data: any): IAttachment[] => {
  if (!data) {
    return [];
  } else {
    const tempAttachments: IAttachment[] = [];
    data.forEach((dataElement: IData) => {
      if (dataElement.elementType !== 'default') {
        tempAttachments.push({
        name: dataElement.fileName,
        url: dataElement.dataLinks.apps,
        iconClass: 'reg reg-attachment' });
      }
    });
    return tempAttachments;
  }
};

export default returnInstanceAttachments;
