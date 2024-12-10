export type UseLibraryQuery<T> = () => {
  data?: T;
  isError?: boolean;
  isPending?: boolean;
};
