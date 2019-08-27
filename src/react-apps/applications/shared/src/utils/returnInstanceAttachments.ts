import { IAttachment, IData } from './../types/index';

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
