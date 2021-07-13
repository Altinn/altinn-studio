function findLastSelectedMetadataOption(metadataOptions: {
  value: {
    repositoryRelativeUrl: string,
    select?: boolean
  }, label: string
}[]) {
  if (!metadataOptions?.length) {
    return undefined;
  }
  return metadataOptions.find(({ value }) => value.select);
}

export default findLastSelectedMetadataOption;
