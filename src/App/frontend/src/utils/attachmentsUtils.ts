import type { IData, IDataType, IDisplayAttachment } from 'src/types/shared';

export enum DataTypeReference {
  IncludeAll = 'include-all',
  RefDataAsPdf = 'ref-data-as-pdf',
  FromTask = 'from-task',
}

export type AttachmentWithDataType = {
  attachment: IData;
  dataType: IDataType | undefined;
};

export function getAttachmentsWithDataType({
  attachments,
  appMetadataDataTypes,
}: {
  attachments: IData[];
  appMetadataDataTypes: IDataType[];
}) {
  return attachments.map((attachment) => ({
    attachment,
    dataType: appMetadataDataTypes.find((dataType) => dataType.id === attachment.dataType),
  }));
}

export const filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes = (
  data: AttachmentWithDataType[],
): AttachmentWithDataType[] => {
  const appMetadataDataTypes = data.map((el) => el.dataType).filter((it): it is IDataType => !!it);
  const appLogicDataTypes = appMetadataDataTypes.filter((dataType) => !!dataType.appLogic);
  const appOwnedDataTypes_Deprecate = appMetadataDataTypes.filter(
    (dataType) => !!dataType.allowedContributers?.some((it) => it === 'app:owned'),
  );
  const appOwnedDataTypes = appMetadataDataTypes.filter(
    (dataType) => !!dataType.allowedContributors?.some((it) => it === 'app:owned'),
  );
  const excludeDataTypes = [...appLogicDataTypes, ...appOwnedDataTypes_Deprecate, ...appOwnedDataTypes].map(
    (dataType) => dataType.id,
  );

  return data.filter(
    (el) =>
      el.attachment.dataType !== DataTypeReference.RefDataAsPdf && !excludeDataTypes.includes(el.attachment.dataType),
  );
};

export function getRefAsPdfAttachments(data: AttachmentWithDataType[]) {
  return data.filter((el) => el.attachment.dataType === DataTypeReference.RefDataAsPdf);
}

export function toDisplayAttachments(data: AttachmentWithDataType[]): IDisplayAttachment[] {
  return data.map(({ attachment, dataType }) => ({
    name: attachment.filename,
    url: attachment.selfLinks?.apps,
    iconClass: 'reg reg-attachment',
    dataType: attachment.dataType,
    grouping: dataType?.grouping ?? undefined,
    description: dataType?.description ?? undefined,
  }));
}

export function getFileContentType(file: File): string {
  if (!file.type) {
    return 'application/octet-stream';
  } else if (file.name.toLowerCase().endsWith('.csv')) {
    return 'text/csv';
  }
  return file.type;
}

export function getSizeWithUnit(bytes: number, numberOfDecimals: number = 0): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(numberOfDecimals)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(numberOfDecimals)} MB`;
}
