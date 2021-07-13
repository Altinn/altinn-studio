function removeSelectFlag(metadataOptions: {
  value: {
    repositoryRelativeUrl: string,
    select?: boolean
  }, label: string
}[]) {
  return metadataOptions.map((v) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { select, ...value } = v.value;
    return ({
      ...v,
      value,
    });
  });
}

export default removeSelectFlag;
