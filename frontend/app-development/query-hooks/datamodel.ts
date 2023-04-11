import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../common/ServiceContext';

export type DatamodelsXsd = {
  description: string;
  directory: string;
  fileName: string;
  filePath: string;
  fileStatus: string;
  fileType: string;
  lastChanged: string;
  repositoryRelativeUrl: string;
};

export const useDatamodelsXsd = (owner, app): UseQueryResult<DatamodelsXsd[]> => {
  const { getDatamodelsXsd } = useServicesContext();
  return useQuery<DatamodelsXsd[]>(['useDatamodelsXsd', owner, app], () =>
    getDatamodelsXsd(owner, app)
  );
};
