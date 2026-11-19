import { FILE_NAME_REGEX } from '@designer/pure-functions';

export const validateLayoutNameAndLayoutSetName = (candidateName: string): boolean | string => {
  return !!candidateName.match(FILE_NAME_REGEX);
};
