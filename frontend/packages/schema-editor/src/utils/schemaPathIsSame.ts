import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';

export const schemaPathIsSame = (opt1: MetadataOption, opt2: MetadataOption) => {
  return (
    !opt2?.value?.repositoryRelativeUrl ||
    opt2.value.repositoryRelativeUrl === opt1?.value?.repositoryRelativeUrl
  );
};
