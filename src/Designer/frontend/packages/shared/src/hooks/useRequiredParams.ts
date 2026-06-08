import { useParams } from 'react-router-dom';

type RouteParamsBase = Record<string, string | undefined>;
type RouteParamKey<TParams extends RouteParamsBase> = Extract<keyof TParams, string>;

export const useRequiredParams = <
  TParams extends RouteParamsBase,
  TKey extends RouteParamKey<TParams>,
>(
  requiredParams: TKey | readonly TKey[],
): Pick<TParams, TKey> => {
  const params = useParams<RouteParamKey<TParams>>() as Partial<TParams>;
  const requiredParamsArray = Array.isArray(requiredParams) ? requiredParams : [requiredParams];
  const missingParams = requiredParamsArray.filter((param) => params[param] === undefined);

  if (missingParams.length > 0) {
    throw new Error(`Missing required route params: ${missingParams.join(', ')}`);
  }

  return params as Pick<TParams, TKey>;
};
