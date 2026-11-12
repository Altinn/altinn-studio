import type { Override } from './Override';

export type RequiredSelection<Object, RequiredKeys extends keyof Object> = Override<
  Required<Pick<Object, RequiredKeys>>,
  Object
>;
