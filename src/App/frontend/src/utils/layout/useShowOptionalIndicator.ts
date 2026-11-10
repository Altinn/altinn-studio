import type { ILabelSettings } from '@app/layout-contract/generated/common.generated';

import { getGlobalUiSettings } from 'src/features/form/ui';
import { useCurrentUiFolderSettingsFromUrl } from 'src/features/form/ui/hooks';
import type { CompExternal } from 'src/layout/layout';

/**
 * Whether an optional field shows the optional indicator. The most specific setting wins: the component's
 * `labelSettings.optionalIndicator`, then `hideOptionalIndicator` in the task's Settings.json, then in the app's.
 * Shown when none is set.
 */
export function useShowOptionalIndicator(labelSettings: ILabelSettings | undefined): boolean {
  const hideByDefault =
    useCurrentUiFolderSettingsFromUrl()?.pages.hideOptionalIndicator ?? getGlobalUiSettings().hideOptionalIndicator;
  return labelSettings?.optionalIndicator ?? !hideByDefault;
}

/**
 * The label settings of a component config. Custom components have none, so they follow the app and task setting.
 */
export function getLabelSettings(config: CompExternal): ILabelSettings | undefined {
  return config.type !== 'Custom' && 'labelSettings' in config ? config.labelSettings : undefined;
}
