export const validateLayoutNameAndLayoutSetName = (candidateName: string): boolean | string => {
  const nameRegex = /^[a-zA-Z0-9_\-\\.]*$/;
  return !!candidateName.match(nameRegex);
};
