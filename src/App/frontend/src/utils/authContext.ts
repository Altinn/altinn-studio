import type { IAuthContext, ITask } from 'src/types/shared';

const noActions: IAuthContext = {
  instantiate: false,
  confirm: false,
  sign: false,
  reject: false,
  read: false,
  write: false,
  complete: false,
};

export function buildAuthContext(process: ITask | undefined): IAuthContext {
  return {
    ...noActions,
    read: Boolean(process?.read),
    write: Boolean(process?.write),
    ...process?.actions,
  };
}
