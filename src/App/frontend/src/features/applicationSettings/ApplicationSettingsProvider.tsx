import type { PropsWithChildren } from 'react';

import type { IApplicationSettings } from 'src/types/shared';

/**
 * Returns frontend settings from window.AltinnAppData.frontendSettings
 */
export const useApplicationSettings = (): IApplicationSettings => window.AltinnAppData?.frontendSettings ?? {};

/**
 * Returns frontend settings from window.AltinnAppData.frontendSettings
 */
export const useLaxApplicationSettings = (): IApplicationSettings => window.AltinnAppData?.frontendSettings ?? {};

/**
 * Legacy export for backward compatibility
 */
export const ApplicationSettingsProvider = ({ children }: PropsWithChildren) => children;
