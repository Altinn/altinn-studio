type QueryOptions = {
  onSuccess?: Function;
  onError?: Function;
  onSettled?: Function;
};

// Only to be used in places where React Query is mocked and "the real" usage is not available
export const queryOptionMock = <T>(args: T, options: QueryOptions) => {
  const { onError, onSettled, onSuccess } = options;

  if (onSuccess) onSuccess();
  if (onError) onError();
  if (onSettled) onSettled();

  return args;
};
