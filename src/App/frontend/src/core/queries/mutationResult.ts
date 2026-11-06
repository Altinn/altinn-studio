/** The application mutation contract. Options and mutation-cache state stay in the query module. */
export interface MutationResult<TData, TVariables = void, TError = Error> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  isSuccess: boolean;
  error: TError | null;
}

export function mutationResult<TData, TVariables, TError>(
  mutation: MutationResult<TData, TVariables, TError>,
): MutationResult<TData, TVariables, TError> {
  const { mutate, mutateAsync, isPending, isSuccess, error } = mutation;
  return { mutate, mutateAsync, isPending, isSuccess, error };
}
