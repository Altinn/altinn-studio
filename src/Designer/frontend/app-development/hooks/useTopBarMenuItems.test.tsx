import { waitFor } from '@testing-library/react';
import { useTopBarMenuItems } from './useTopBarMenuItems';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { type CanUseFeature } from 'app-shared/types/api/CanUseFeatureResponse';
import { FeatureFlag } from '@studio/feature-flags';

const mockUseIsRepoOwnerOrg = jest.fn();

jest.mock('app-development/hooks/useIsRepoOwnerOrg', () => ({
  useIsRepoOwnerOrg: () => mockUseIsRepoOwnerOrg(),
}));

describe('useTopBarMenuItems', () => {
  afterEach(jest.clearAllMocks);

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
    const canUseFeature = jest.fn(() => new Promise<CanUseFeature>(() => {}));
    const { renderHookResult } = renderHookWithProviders({ canUseFeature }, undefined, [
      FeatureFlag.AiAssistant,
    ])(() => useTopBarMenuItems());

    expect(keysOf(renderHookResult.result.current)).not.toContain(HeaderMenuItemKey.AiAssistant);
  });
});

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
  const canUseFeature = jest.fn().mockResolvedValue({ canUseFeature: canUseAiAssistant });
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
