import type { IProcessPermissions, IProcessState } from 'src/features/process';
import type { IAuthContext } from 'src/types/shared';

export function buildAuthContext(process: IProcessState | IProcessPermissions | undefined): Partial<IAuthContext> {
  return {
    read: Boolean(process?.read),
    write: Boolean(process?.write),
    ...process?.actions,
  };
}
