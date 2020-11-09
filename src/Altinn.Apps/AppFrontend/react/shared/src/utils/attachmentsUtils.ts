import { IAttachment, IData, ITextResource, IAttachmentGrouping, IDataType, IApplication } from '../types/index';
import { getTextResourceByKey } from './language';

export const mapInstanceAttachments = (data: IData[], defaultElementId: string, platform?: boolean): IAttachment[] => {
  if (!data) {
    return [];
  }
  const tempAttachments: IAttachment[] = [];
  data.forEach((dataElement: IData) => {
    if (dataElement.id !== defaultElementId && dataElement.dataType !== 'ref-data-as-pdf') {
      tempAttachments.push({
        name: dataElement.filename,
        url: platform ? dataElement.selfLinks.platform : dataElement.selfLinks.apps,
        iconClass: 'reg reg-attachment',
        dataType: dataElement.dataType,
      });
    }
  });
  return tempAttachments;
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
    dataType: pdfElement.dataType,
  };
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
export const getGroupingForAttachment = (
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
