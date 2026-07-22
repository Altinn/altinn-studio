import type { IAuthContext, ITask } from 'src/types/shared';

export function buildAuthContext(process: ITask | undefined): Partial<IAuthContext> {
  return {
    read: Boolean(process?.read),
    write: Boolean(process?.write),
    ...process?.actions,
  };
}
