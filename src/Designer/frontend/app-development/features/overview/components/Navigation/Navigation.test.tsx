import { screen } from '@testing-library/react';
import { Navigation } from './Navigation';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'app-development/test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { FeatureFlag } from '@studio/feature-flags';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { app, org } from '@studio/testing/testids';

const mockUseIsRepoOwnerOrg = jest.fn();

jest.mock('app-development/hooks/useIsRepoOwnerOrg', () => ({
  useIsRepoOwnerOrg: () => mockUseIsRepoOwnerOrg(),
}));

describe('Navigation', () => {
  afterEach(jest.clearAllMocks);

  it.each([
    HeaderMenuItemKey.Create,
    HeaderMenuItemKey.DataModel,
    HeaderMenuItemKey.Text,
    HeaderMenuItemKey.ProcessEditor,
    HeaderMenuItemKey.ContentLibrary,
  ])('renders a link to the %s tool', (menuItemKey) => {
    renderNavigation();
    const toolLink = screen.getByRole('link', { name: textMock(menuItemKey) });
    expect(toolLink).toBeInTheDocument();
  });

  it('does not render the About item', () => {
    renderNavigation();
    const aboutLink = screen.queryByRole('link', { name: textMock(HeaderMenuItemKey.About) });
    expect(aboutLink).not.toBeInTheDocument();
  });

  it('does not render the Deploy item', () => {
    renderNavigation();
    const deployLink = screen.queryByRole('link', { name: textMock(HeaderMenuItemKey.Deploy) });
    expect(deployLink).not.toBeInTheDocument();
  });

  it('shows AI assistant when the repo owner is an organisation and feature flag is enabled', () => {
    renderNavigation({ featureFlags: [FeatureFlag.AiAssistant], isRepoOwnerOrg: true });
    const assistantLink = screen.getByRole('link', {
      name: textMock(HeaderMenuItemKey.AiAssistant),
    });
    expect(assistantLink).toBeInTheDocument();
  });

  it('hides AI assistant from personal repos, even when feature flag is enabled', () => {
    renderNavigation({ featureFlags: [FeatureFlag.AiAssistant], isRepoOwnerOrg: false });
    const assistantLink = screen.queryByRole('link', {
      name: textMock(HeaderMenuItemKey.AiAssistant),
    });
    expect(assistantLink).not.toBeInTheDocument();
  });

  it('marks beta items with the beta class', () => {
    renderNavigation();
    const contentLibraryLink = screen.getByRole('link', {
      name: textMock(HeaderMenuItemKey.ContentLibrary),
    });
    expect(contentLibraryLink).toHaveClass('isBeta');
  });

  it('does not mark non-beta items with the beta class', () => {
    renderNavigation();
    const createLink = screen.getByRole('link', { name: textMock(HeaderMenuItemKey.Create) });
    expect(createLink).not.toHaveClass('isBeta');
  });
});

type RenderNavigationProps = {
  featureFlags?: FeatureFlag[];
  isRepoOwnerOrg?: boolean;
};

const renderNavigation = ({
  featureFlags = [],
  isRepoOwnerOrg = false,
}: RenderNavigationProps = {}) => {
  mockUseIsRepoOwnerOrg.mockReturnValue(isRepoOwnerOrg);
  renderWithProviders(<Navigation />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    featureFlags,
  });
};
