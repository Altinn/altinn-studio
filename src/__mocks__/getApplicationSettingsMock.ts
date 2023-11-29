import type { IApplicationSettings } from 'src/types/shared';

export const getApplicationSettingsMock = (): IApplicationSettings => ({
  id: 'mockOrg/test-app',
  org: 'mockOrg',
});
