import { FILE_NAME_REGEX } from 'app-shared/constants';

export const validateLayoutNameAndLayoutSetName = (candidateName: string): boolean | string => {
  return !!candidateName.match(FILE_NAME_REGEX);
};
