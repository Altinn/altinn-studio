import React from 'react';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithMockStore } from '../../../../frontend/packages/ux-editor/src/testing/mocks';
import { layoutSetsMock } from '../../../../frontend/packages/ux-editor/src/testing/layoutMock';
import type { AppPreviewSubMenuProps } from './AppPreviewSubMenu';
import { AppPreviewSubMenu } from './AppPreviewSubMenu';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryKey } from 'app-shared/types/QueryKey';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const user = userEvent.setup();

// Test data
const org = 'org';
const app = 'app';

describe('AppPreviewSubMenu', () => {
  afterEach(jest.clearAllMocks);

  const props: AppPreviewSubMenuProps = {
    viewSize: 'desktop',
    setViewSize: jest.fn(),
    selectedLayoutSet: 'test-layout-set',
    handleChangeLayoutSet: jest.fn(),
  };

  it('renders the component with desktop viewSize', () => {
    setQueryData(null);
    renderWithMockStore()(<AppPreviewSubMenu {...props} />);
    const desktopButton = screen.getByRole('button', { name: 'preview.view_size_desktop' });
    const mobileButton = screen.getByRole('button', { name: 'preview.view_size_mobile' });
    expect(desktopButton).toHaveAttribute('aria-pressed', 'true');
    expect(mobileButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders the component with mobile viewSize', () => {
    setQueryData(null);
    renderWithMockStore()(<AppPreviewSubMenu {...props} viewSize='mobile' />);
    const desktopButton = screen.getByRole('button', { name: 'preview.view_size_desktop' });
    const mobileButton = screen.getByRole('button', { name: 'preview.view_size_mobile' });
    expect(desktopButton).toHaveAttribute('aria-pressed', 'false');
    expect(mobileButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the component with layout sets in select list', async () => {
    setQueryData(layoutSetsMock);
    renderWithMockStore()(<AppPreviewSubMenu {...props} />);
    const layoutSetSelector = screen.getByRole('combobox');
    await act(() => user.click(layoutSetSelector));
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(layoutSetsMock.sets.length);
  });
});

const setQueryData = (layoutSets: LayoutSets | null) => {
  queryClientMock.setQueryData([QueryKey.LayoutSets, org, app], layoutSets);
};
