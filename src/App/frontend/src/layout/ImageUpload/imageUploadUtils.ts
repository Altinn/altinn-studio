import { IMAGE_TYPE } from '@app/form-component';

import type { IDataType } from 'src/types/shared';

type AllowedImageTypeParams = {
  baseComponentId: string;
  dataTypes: IDataType[];
};

export const isAllowedContentTypesValid = ({ baseComponentId, dataTypes }: AllowedImageTypeParams) => {
  const dataTypeItem = dataTypes.find((dt) => dt.id === baseComponentId);
  const allowedTypes = (dataTypeItem?.allowedContentTypes ?? []).map((type) => type.toLowerCase());

  return allowedTypes.length === 0 || allowedTypes.includes(IMAGE_TYPE);
};
