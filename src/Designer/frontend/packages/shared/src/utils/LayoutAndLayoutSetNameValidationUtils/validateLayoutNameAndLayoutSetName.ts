import { FILE_NAME_REGEX } from 'libs/studio-pure-functions/src';

export const validateLayoutNameAndLayoutSetName = (candidateName: string): boolean | string => {
  return !!candidateName.match(FILE_NAME_REGEX);
};
