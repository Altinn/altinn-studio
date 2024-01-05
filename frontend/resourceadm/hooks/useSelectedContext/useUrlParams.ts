import { Params, useParams } from 'react-router-dom';

export const useUrlParams = (): Readonly<Params<string>> => {
  const params = useParams();
  return {
    ...params,
    repo: `${params.selectedContext}-resources`,
  };
};
