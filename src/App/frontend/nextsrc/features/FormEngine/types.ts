export type Override<T, K extends keyof T, NewType> = Omit<T, K> & {
  [P in K]: NewType;
};
