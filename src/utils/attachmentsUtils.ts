import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IApplication, IAttachment, IAttachmentGrouping, IData, IDataType } from 'src/types/shared';

export const mapInstanceAttachments = (
  data: IData[] | undefined,
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
      url: platform ? dataElement.selfLinks?.platform : dataElement.selfLinks?.apps,
      iconClass: 'reg reg-attachment',
      dataType: dataElement.dataType,
    });
  });
  return tempAttachments;
};

export const getInstancePdf = (data: IData[] | undefined, platform?: boolean): IAttachment[] | undefined => {
  if (!data) {
    return undefined;
  }

  const pdfElements = data.filter((element) => element.dataType === 'ref-data-as-pdf');

  if (!pdfElements) {
    return undefined;
  }

  return pdfElements.map((element) => {
    const pdfUrl = platform ? element.selfLinks?.platform : element.selfLinks?.apps;
    return {
      name: element.filename,
      url: pdfUrl,
      iconClass: 'reg reg-attachment',
      dataType: element.dataType,
    };
  });
};

/**
 * Gets the attachment groupings from a list of attachments.
 */
export const getAttachmentGroupings = (
  attachments: IAttachment[] | undefined,
  applicationMetadata: IApplication | null,
  langTools: IUseLanguage,
): IAttachmentGrouping => {
  const attachmentGroupings: IAttachmentGrouping = {};

  if (!attachments || !applicationMetadata) {
    return attachmentGroupings;
  }

  attachments.forEach((attachment: IAttachment) => {
    const grouping = getGroupingForAttachment(attachment, applicationMetadata);
    const title = langTools.langAsString(grouping);
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
export const getGroupingForAttachment = (attachment: IAttachment, applicationMetadata: IApplication): string => {
  if (!applicationMetadata || !applicationMetadata.dataTypes || !attachment) {
    return 'null';
  }

  const attachmentType = applicationMetadata.dataTypes.find(
    (dataType: IDataType) => dataType.id === attachment.dataType,
  );

  if (!attachmentType || !attachmentType.grouping) {
    return 'null';
  }

  return attachmentType.grouping;
};
