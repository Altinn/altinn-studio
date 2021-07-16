interface PathOption {
  value?: {
    repositoryRelativeUrl: string
  }
}
const schemaPathIsSame = (opt1: PathOption, opt2: PathOption) => {
  if (!opt2?.value?.repositoryRelativeUrl) {
    return true;
  }
  return opt2.value.repositoryRelativeUrl === opt1?.value?.repositoryRelativeUrl;
};

export default schemaPathIsSame;
