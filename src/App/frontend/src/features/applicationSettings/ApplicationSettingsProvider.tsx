import type { IApplicationSettings } from 'src/types/shared';

/**
 * Returns frontend settings from window.AltinnAppData.frontendSettings
 */
export const useApplicationSettings = (): IApplicationSettings => window.AltinnAppGlobalData.frontendSettings;

/**
 * Returns frontend settings from window.AltinnAppData.frontendSettings
 */
export const useLaxApplicationSettings = (): IApplicationSettings => window.AltinnAppGlobalData.frontendSettings;
