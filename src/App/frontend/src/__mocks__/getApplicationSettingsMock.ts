import type { IApplicationSettings } from 'src/types/shared';

export const getApplicationSettingsMock = (
  overrides: Partial<IApplicationSettings> | ((settings: IApplicationSettings) => void) = {},
): IApplicationSettings => {
  const out: IApplicationSettings = {};

  if (typeof overrides === 'function') {
    overrides(out);
  } else if (overrides && Object.keys(overrides).length > 0) {
    Object.assign(out, overrides);
  }

  return out;
};
