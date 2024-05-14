type QueryOptions = {
  onSuccess?: Function;
  onError?: Function;
  onSettled?: Function;
};

export const queryOptionMock = <T>(args: T, options: QueryOptions) => {
  const { onError, onSettled, onSuccess } = options;

  if (onSuccess) onSuccess();
  if (onError) onError();
  if (onSettled) onSettled();

  return args;
};
