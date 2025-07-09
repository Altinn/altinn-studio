import React from 'react';
import { screen } from '@testing-library/react';
import { DesignViewNavigation } from './DesignViewNavigation';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '../../testing/layoutSetsMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

describe('DesignViewNavigation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render DesignViewNavigation with correct text', async () => {
    renderDesignViewNavigation({});
    expect(await screen.findByText(textMock('ux_editor.page_layout_header'))).toBeInTheDocument();
  });

  it('should render menu button with correct title', () => {
    renderDesignViewNavigation({});
    const menuButton = screen.getByTitle(textMock('general.options'));
    expect(menuButton).toBeInTheDocument();
  });

  it('should have aria-haspopup attribute set to "menu"', () => {
    renderDesignViewNavigation({});
    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    expect(menuButton).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('should be possible to toggle dropdown menu', async () => {
    const user = userEvent.setup();
    renderDesignViewNavigation({});
    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await user.click(document.body);
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should show button to convert to page groups if layout is using page order', async () => {
    const user = userEvent.setup();
    renderDesignViewNavigation({});
    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    await user.click(menuButton);
    expect(
      screen.getByRole('menuitem', { name: textMock('ux_editor.page_layout_add_group_division') }),
    ).toBeInTheDocument();
  });

  it('should call convertToPageGroups when clicking convertion button', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    const convertToPageGroups = jest.fn();
    renderDesignViewNavigation({ queries: { convertToPageGroups } });
    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    await user.click(menuButton);
    await user.click(
      screen.getByRole('menuitem', { name: textMock('ux_editor.page_layout_add_group_division') }),
    );
    expect(convertToPageGroups).toHaveBeenCalledTimes(1);
    expect(convertToPageGroups).toHaveBeenCalledWith(org, app, layoutSet1NameMock);
    confirmSpy.mockRestore();
  });

  it('should show button to convert to page order if layout is using page groups', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.Pages, org, app, layoutSet1NameMock], {
      groups: [{ id: 'Page 1' }],
    });
    renderDesignViewNavigation({ queryClient });
    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    await user.click(menuButton);
    expect(
      screen.getByRole('menuitem', {
        name: textMock('ux_editor.page_layout_remove_group_division'),
      }),
    ).toBeInTheDocument();
  });

  it('should call convertToPageOrder when clicking convertion button', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.Pages, org, app, layoutSet1NameMock], {
      groups: [{ id: 'Page 1' }],
    });
    const convertToPageOrder = jest.fn();
    renderDesignViewNavigation({ queryClient, queries: { convertToPageOrder } });
    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    await user.click(menuButton);
    await user.click(
      screen.getByRole('menuitem', {
        name: textMock('ux_editor.page_layout_remove_group_division'),
      }),
    );
    expect(convertToPageOrder).toHaveBeenCalledTimes(1);
    expect(convertToPageOrder).toHaveBeenCalledWith(org, app, layoutSet1NameMock);
    confirmSpy.mockRestore();
  });
});

const renderDesignViewNavigation = ({
  queries,
  queryClient,
}: {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
}) => {
  return renderWithProviders(<DesignViewNavigation />, { queries, queryClient });
};
