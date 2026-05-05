import { screen } from '@testing-library/react';
import { LargeNavigationMenu } from './LargeNavigationMenu';
import { renderWithProviders } from '../../../../testing/mocks';
import type { HeaderMenuItem } from '../../../../types/HeaderMenuItem';
import { HeaderMenuGroupKey } from '../../../../enums/HeaderMenuGroupKey';
import { HeaderMenuItemKey } from '../../../../enums/HeaderMenuItemKey';

jest.mock('../../../../hooks/useSelectedContext', () => ({
  useSelectedContext: () => 'ttd',
}));

jest.mock('../../../../hooks/useSubRoute', () => ({
  useSubroute: () => 'dashboard',
}));

type RenderLargeNavigationMenuProps = {
  menuItems: HeaderMenuItem[];
};

function renderLargeNavigationMenu({ menuItems }: RenderLargeNavigationMenuProps) {
  return renderWithProviders(<LargeNavigationMenu menuItems={menuItems} />);
}

describe('LargeNavigationMenu', () => {
  it('should render StudioLink when the menu item is an external link', () => {
    const getLink = jest.fn(
      (selectedContext?: string) => `https://example.com/${selectedContext ?? ''}`,
    );
    const menuItems: HeaderMenuItem[] = [
      {
        key: HeaderMenuItemKey.Admin,
        getLink,
        name: 'External docs',
        group: HeaderMenuGroupKey.Other,
        isExternalLink: true,
      },
    ];

    renderLargeNavigationMenu({ menuItems });

    const externalLink = screen.getByRole('link', { name: 'External docs' });
    expect(externalLink).toHaveAttribute('href', 'https://example.com/ttd');
    expect(getLink).toHaveBeenCalledWith('ttd');
  });
});
