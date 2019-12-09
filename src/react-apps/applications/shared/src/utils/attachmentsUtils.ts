import { IAttachment, IData } from '../types/index';

export const mapInstanceAttachments = (data: IData[], defaultElementId: string): IAttachment[] => {
  if (!data) {
    return [];
  } else {
    const tempAttachments: IAttachment[] = [];
    data.forEach((dataElement: IData) => {
      if (dataElement.id !== defaultElementId && dataElement.dataType !== 'ref-data-as-pdf') {
        tempAttachments.push({
        name: dataElement.filename,
        url: dataElement.selfLinks.apps,
        iconClass: 'reg reg-attachment' });
      }
    });
    return tempAttachments;
  }
};

export const getInstancePdf = (data: IData[], platform?: boolean): IAttachment => {
  if (!data) {
    return null;
  }

  const pdfElement = data.find((element) => element.dataType === 'ref-data-as-pdf');

  if (!pdfElement) {
    return null;
  }

  const pdfUrl = platform ? pdfElement.selfLinks.platform : pdfElement.selfLinks.apps;

  return {
    name: pdfElement.filename,
    url: pdfUrl,
    iconClass: 'reg reg-attachment',
  };
};
