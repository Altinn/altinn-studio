import type { IMetadataOption } from './types';

export const schemaPathIsSame = (opt1: IMetadataOption, opt2: IMetadataOption) => {
  return (
    !opt2?.value?.repositoryRelativeUrl ||
    opt2.value.repositoryRelativeUrl === opt1?.value?.repositoryRelativeUrl
  );
};
