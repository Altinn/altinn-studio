export type SignatureConfig = {
  signatureDataType: string;
  dataTypesToSign: { dataTypes: { dataType: string }[] };
  uniqueFromSignaturesInDataTypes?: { dataTypes: string[] };
  signeeStatesDataTypeId?: string;
  signeeProviderId?: string;
  correspondenceResource?: string;
  signingPdfDataType?: string;
  runDefaultValidator?: boolean;
};
