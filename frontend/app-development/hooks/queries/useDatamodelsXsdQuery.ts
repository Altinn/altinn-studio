import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';

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

export const useDatamodelsXsdQuery = (owner, app): UseQueryResult<DatamodelsXsd[]> => {
  const { getDatamodelsXsd } = useServicesContext();
  return useQuery<DatamodelsXsd[]>([QueryKey.DatamodelsXsd, owner, app], () =>
    getDatamodelsXsd(owner, app)
  );
};
