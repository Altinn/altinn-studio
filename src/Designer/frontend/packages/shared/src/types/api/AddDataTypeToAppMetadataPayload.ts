export type AddDataTypeToAppMetadataPayload = {
  dataTypeId: string;
  taskId: string;
  allowedContributors?: Array<string>;
  allowedContentTypes?: Array<string>;
};
