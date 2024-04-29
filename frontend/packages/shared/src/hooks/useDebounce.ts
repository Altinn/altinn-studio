type UseDebounceOptions = {
  debounceTimeInMs: number;
};
export const useDebounce = ({ debounceTimeInMs }: UseDebounceOptions) => {
  const debounce = (callback: Function) => {
    setTimeout(() => {
      callback();
    }, debounceTimeInMs);
  };
  return { debounce };
};
