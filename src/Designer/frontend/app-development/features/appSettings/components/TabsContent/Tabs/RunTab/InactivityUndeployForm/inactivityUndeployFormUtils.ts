import type { AppSettings, AppSettingsPayload } from 'app-shared/types/AppSettings';
import { parseInactivityPeriodDays } from 'app-shared/utils/inactivityPeriodUtils';

export enum UndeployChoice {
  Inherit = 'inherit',
  On = 'on',
  Off = 'off',
}

export enum PeriodChoice {
  Inherit = 'inherit',
  Custom = 'custom',
}

export type InactivityUndeployDraft = {
  undeployChoice: UndeployChoice;
  periodChoice: PeriodChoice;
  customPeriodDays: string;
};

export function createDraft(appSettings: AppSettings): InactivityUndeployDraft {
  return {
    undeployChoice: toUndeployChoice(appSettings.undeployOnInactivity),
    periodChoice:
      appSettings.inactivityPeriodDays === null ? PeriodChoice.Inherit : PeriodChoice.Custom,
    customPeriodDays: String(
      appSettings.inactivityPeriodDays ?? appSettings.orgInactivityPeriodDays,
    ),
  };
}

function toUndeployChoice(undeployOnInactivity: boolean | null): UndeployChoice {
  switch (undeployOnInactivity) {
    case null:
      return UndeployChoice.Inherit;
    case true:
      return UndeployChoice.On;
    case false:
      return UndeployChoice.Off;
  }
}

function toUndeployOnInactivity(undeployChoice: UndeployChoice): boolean | null {
  switch (undeployChoice) {
    case UndeployChoice.Inherit:
      return null;
    case UndeployChoice.On:
      return true;
    case UndeployChoice.Off:
      return false;
  }
}

export function isCustomPeriodInvalid(draft: InactivityUndeployDraft): boolean {
  return (
    draft.periodChoice === PeriodChoice.Custom &&
    parseInactivityPeriodDays(draft.customPeriodDays) === null
  );
}

/** Returns null when the draft holds an invalid custom period. */
export function toPayload(draft: InactivityUndeployDraft): AppSettingsPayload | null {
  if (isCustomPeriodInvalid(draft)) {
    return null;
  }
  return {
    undeployOnInactivity: toUndeployOnInactivity(draft.undeployChoice),
    inactivityPeriodDays:
      draft.periodChoice === PeriodChoice.Custom
        ? parseInactivityPeriodDays(draft.customPeriodDays)
        : null,
  };
}

export function hasChanges(draft: InactivityUndeployDraft, appSettings: AppSettings): boolean {
  const payload = toPayload(draft);
  if (payload === null) {
    return true;
  }
  return (
    payload.undeployOnInactivity !== appSettings.undeployOnInactivity ||
    payload.inactivityPeriodDays !== appSettings.inactivityPeriodDays
  );
}
