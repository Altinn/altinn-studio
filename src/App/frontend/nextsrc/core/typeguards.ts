import type { IPagesSettings, IPagesSettingsWithGroups, IPagesSettingsWithOrder } from 'src/layout/common.generated';

export function isPagesSettingsWithOrder(settings: IPagesSettings): settings is IPagesSettingsWithOrder {
  return 'order' in settings;
}

export function isPagesSettingsWithGroups(settings: IPagesSettings): settings is IPagesSettingsWithGroups {
  return 'groups' in settings;
}
