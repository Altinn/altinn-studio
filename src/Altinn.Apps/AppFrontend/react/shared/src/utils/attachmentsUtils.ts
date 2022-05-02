import { IAttachment, IData, ITextResource, IAttachmentGrouping, IDataType, IApplication } from '../types/index';
import { getTextResourceByKey } from './language';

export const mapInstanceAttachments = (
  data: IData[],
  defaultElementIds: string[],
  platform?: boolean,
): IAttachment[] => {
  if (!data) {
    return [];
  }
  const tempAttachments: IAttachment[] = [];
  data.forEach((dataElement: IData) => {
    if (defaultElementIds.indexOf(dataElement.dataType) > -1 || dataElement.dataType === 'ref-data-as-pdf') {
      return;
    }

    tempAttachments.push({
      name: dataElement.filename,
      url: platform ? dataElement.selfLinks.platform : dataElement.selfLinks.apps,
      iconClass: 'reg reg-attachment',
      dataType: dataElement.dataType,
    });
  });
  return tempAttachments;
};

export const getInstancePdf = (data: IData[], platform?: boolean): IAttachment[] => {
  if (!data) {
    return null;
  }

  const pdfElements = data.filter((element) => element.dataType === 'ref-data-as-pdf');

  if (!pdfElements) {
    return null;
  }

  const result = pdfElements.map((element) => {
    const pdfUrl = platform ? element.selfLinks.platform : element.selfLinks.apps;
    return {
      name: element.filename,
      url: pdfUrl,
      iconClass: 'reg reg-attachment',
      dataType: element.dataType,
    };
  });
  return result;
};

/**
 * Gets the attachment groupings from a list of attachments.
 * @param attachments the attachments
 * @param applicationMetadata the application metadata
 * @param textResources the application text resources
 */
export const getAttachmentGroupings = (
  attachments: IAttachment[],
  applicationMetadata: IApplication,
  textResources: ITextResource[],
): IAttachmentGrouping => {
  const attachmentGroupings: IAttachmentGrouping = {};

  if (!attachments || !applicationMetadata || !textResources) {
    return attachmentGroupings;
  }

  attachments.forEach((attachment: IAttachment) => {
    const grouping = getGroupingForAttachment(attachment, applicationMetadata);
    const title = getTextResourceByKey(grouping, textResources);
    if (!attachmentGroupings[title]) {
      attachmentGroupings[title] = [];
    }
    attachmentGroupings[title].push(attachment);
  });

  return attachmentGroupings;
};

/**
 * Gets the grouping for a specific attachment
 * @param attachment the attachment
 * @param applicationMetadata the application metadata
 */
const getGroupingForAttachment = (
  attachment: IAttachment,
  applicationMetadata: IApplication,
): string => {
  if (!applicationMetadata || !applicationMetadata.dataTypes || !attachment) {
    return null;
  }

  const attachmentType = applicationMetadata.dataTypes.find(
    (dataType: IDataType) => dataType.id === attachment.dataType,
  );

  if (!attachmentType || !attachmentType.grouping) {
    return null;
  }

  return attachmentType.grouping;
};
