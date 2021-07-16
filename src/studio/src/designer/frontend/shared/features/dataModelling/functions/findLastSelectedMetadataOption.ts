import { IMetadataOption } from "./types";

function findLastSelectedMetadataOption(metadataOptions: IMetadataOption[]) {
  if (!metadataOptions?.length) {
    return undefined;
  }
  return metadataOptions.find(({ value }) => value.select);
}

export default findLastSelectedMetadataOption;
