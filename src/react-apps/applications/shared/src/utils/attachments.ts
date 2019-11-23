import { IAttachment, IData } from './../types/index';

export const mapInstanceAttachments = (data: IData[]): IAttachment[] => {
  if (!data) {
    return [];
  } else {
    const tempAttachments: IAttachment[] = [];
    data.forEach((dataElement: IData) => {
      if (dataElement.elementType !== 'default' && dataElement.elementType !== 'ref-data-as-pdf') {
        tempAttachments.push({
        name: dataElement.fileName,
        url: dataElement.dataLinks.apps,
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

  const pdfElement = data.find((element) => element.elementType === 'ref-data-as-pdf');

  if (!pdfElement) {
    return null;
  }

  const pdfUrl = platform ? pdfElement.dataLinks.platform : pdfElement.dataLinks.apps;

  return {
    name: pdfElement.fileName,
    url: pdfUrl,
    iconClass: 'reg reg-attachment',
  };
};
