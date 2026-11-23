import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useTopBarMenuItems } from './useTopBarMenuItems';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { type CanUseFeature } from 'app-shared/types/api/CanUseFeatureResponse';
import { FeatureFlag } from '@designer/feature-flags';
import type { AppVersion } from 'app-shared/types/AppVersion';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

const mockUseIsRepoOwnerOrg = vi.fn();

vi.mock('app-development/hooks/useIsRepoOwnerOrg', () => ({
  useIsRepoOwnerOrg: () => mockUseIsRepoOwnerOrg(),
}));

describe('useTopBarMenuItems', () => {
  it('includes the items every app repository has', () => {
    const { result } = renderUseTopBarMenuItems();

    expect(keysOf(result.current)).toEqual([
      HeaderMenuItemKey.About,
      HeaderMenuItemKey.Create,
      HeaderMenuItemKey.DataModel,
      HeaderMenuItemKey.Text,
      HeaderMenuItemKey.ProcessEditor,
      HeaderMenuItemKey.ContentLibrary,
    ]);
  });

  it('includes only the data model item for data model repositories', () => {
    const { result } = renderUseTopBarMenuItems({ path: '/testOrg/testOrg-datamodels' });

    expect(keysOf(result.current)).toEqual([HeaderMenuItemKey.DataModel]);
  });

  it('includes Deploy when an org owns the repo', () => {
    const { result } = renderUseTopBarMenuItems({ isRepoOwnerOrg: true });

    expect(keysOf(result.current)).toContain(HeaderMenuItemKey.Deploy);
  });

  it('excludes Deploy when a user owns the repo', () => {
    const { result } = renderUseTopBarMenuItems({ isRepoOwnerOrg: false });

    expect(keysOf(result.current)).not.toContain(HeaderMenuItemKey.Deploy);
  });

  it('includes Assistant when its feature flag is active and the backend allows it', async () => {
    const { result } = renderUseTopBarMenuItems({
      featureFlags: [FeatureFlag.AiAssistant],
      canUseAiAssistant: true,
    });

    await waitFor(() => expect(keysOf(result.current)).toContain(HeaderMenuItemKey.AiAssistant));
  });

  it('excludes Assistant when its feature flag is inactive', async () => {
    const { result, canUseFeature } = renderUseTopBarMenuItems({
      featureFlags: [],
      canUseAiAssistant: true,
    });

    await waitFor(() => expect(canUseFeature).toHaveBeenCalled());
    expect(keysOf(result.current)).not.toContain(HeaderMenuItemKey.AiAssistant);
  });

  it('excludes Assistant when the backend denies it', async () => {
    const { result, canUseFeature } = renderUseTopBarMenuItems({
      featureFlags: [FeatureFlag.AiAssistant],
      canUseAiAssistant: false,
    });

    await waitFor(() => expect(canUseFeature).toHaveBeenCalled());
    expect(keysOf(result.current)).not.toContain(HeaderMenuItemKey.AiAssistant);
  });

  it('excludes Assistant while the backend answer is loading', () => {
    const canUseFeature = vi.fn(() => new Promise<CanUseFeature>(() => {}));
    const { renderHookResult } = renderHookWithProviders({ canUseFeature }, undefined, [
      FeatureFlag.AiAssistant,
    ])(() => useTopBarMenuItems());

    expect(keysOf(renderHookResult.result.current)).not.toContain(HeaderMenuItemKey.AiAssistant);
  });

  it('includes the app builder for a new v9 app when its feature flag is active', async () => {
    const { result } = renderUseTopBarMenuItemsForAppBuilder({
      featureFlags: [FeatureFlag.AppBuilder],
    });

    await waitFor(() => expect(keysOf(result.current)).toContain(HeaderMenuItemKey.AppBuilder));
  });

  it('excludes the app builder when its feature flag is inactive', async () => {
    const { result, getAppMetadata } = renderUseTopBarMenuItemsForAppBuilder({ featureFlags: [] });

    await waitFor(() => expect(getAppMetadata).toHaveBeenCalled());
    expect(keysOf(result.current)).not.toContain(HeaderMenuItemKey.AppBuilder);
  });

  it('excludes the app builder for an app created before it was offered', async () => {
    const { result, getAppMetadata } = renderUseTopBarMenuItemsForAppBuilder({
      featureFlags: [FeatureFlag.AppBuilder],
      created: '2026-01-01T00:00:00Z',
    });

    await waitFor(() => expect(getAppMetadata).toHaveBeenCalled());
    expect(keysOf(result.current)).not.toContain(HeaderMenuItemKey.AppBuilder);
  });

  it('excludes the app builder for an app below v9', async () => {
    const { result, getAppVersion } = renderUseTopBarMenuItemsForAppBuilder({
      featureFlags: [FeatureFlag.AppBuilder],
      version: { backendVersion: '8.0.0', frontendVersion: '4.0.0' },
    });

    await waitFor(() => expect(getAppVersion).toHaveBeenCalled());
    expect(keysOf(result.current)).not.toContain(HeaderMenuItemKey.AppBuilder);
  });
});

type RenderUseTopBarMenuItemsForAppBuilderProps = {
  featureFlags: FeatureFlag[];
  created?: string;
  version?: AppVersion;
};

const renderUseTopBarMenuItemsForAppBuilder = ({
  featureFlags,
  created = '2026-12-01T00:00:00Z',
  version = { backendVersion: '9.0.0', frontendVersion: '9.0.0' },
}: RenderUseTopBarMenuItemsForAppBuilderProps) => {
  mockUseIsRepoOwnerOrg.mockReturnValue(false);
  const getAppVersion = vi.fn().mockResolvedValue(version);
  const getAppMetadata = vi
    .fn()
    .mockResolvedValue({ id: 'org/app', org: 'org', created } satisfies ApplicationMetadata);
  const { renderHookResult } = renderHookWithProviders(
    { getAppVersion, getAppMetadata },
    undefined,
    featureFlags,
  )(() => useTopBarMenuItems());
  return { result: renderHookResult.result, getAppVersion, getAppMetadata };
};

type RenderUseTopBarMenuItemsProps = {
  isRepoOwnerOrg?: boolean;
  featureFlags?: FeatureFlag[];
  canUseAiAssistant?: boolean;
  path?: string;
};

const renderUseTopBarMenuItems = ({
  isRepoOwnerOrg = false,
  featureFlags = [],
  canUseAiAssistant = false,
  path,
}: RenderUseTopBarMenuItemsProps = {}) => {
  mockUseIsRepoOwnerOrg.mockReturnValue(isRepoOwnerOrg);
  const canUseFeature = vi.fn().mockResolvedValue({ canUseFeature: canUseAiAssistant });
  const { renderHookResult } = renderHookWithProviders(
    { canUseFeature },
    undefined,
    featureFlags,
    path,
  )(() => useTopBarMenuItems());
  return { result: renderHookResult.result, canUseFeature };
};

const keysOf = (menuItems: HeaderMenuItem[]): HeaderMenuItemKey[] =>
  menuItems.map((menuItem) => menuItem.key);
