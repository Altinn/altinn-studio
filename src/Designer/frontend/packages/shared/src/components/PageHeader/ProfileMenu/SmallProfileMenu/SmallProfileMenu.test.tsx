import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { StudioProfileMenuGroup } from '@studio/components';
import { SmallProfileMenu } from './SmallProfileMenu';

const mockUser = {
  avatar_url: '',
  email: 'test@test.no',
  full_name: 'Test Testersen',
  id: 11,
  login: 'test',
  userType: 1,
};

const mockUseUserQuery = jest.fn();

jest.mock('app-shared/hooks/queries', () => ({
  ...jest.requireActual('app-shared/hooks/queries'),
  useUserQuery: () => mockUseUserQuery(),
}));

const mockMenuAction = jest.fn();

const menuItems: StudioProfileMenuGroup[] = [
  {
    name: textMock('top_bar.group_tools'),
    items: [
      {
        action: { type: 'link', href: '/dashboard/app/test', openInNewTab: false },
        itemName: textMock('dashboard.header_item_dashboard'),
      },
      {
        action: { type: 'link', href: '/repos/test', openInNewTab: true },
        itemName: textMock('shared.header_go_to_gitea'),
      },
    ],
  },
  {
    name: textMock('top_bar.group_organizations'),
    items: [
      {
        action: { type: 'button', onClick: mockMenuAction },
        itemName: 'Skatteetaten',
        isActive: true,
      },
    ],
  },
];

describe('SmallProfileMenu', () => {
  beforeEach(() => {
    mockUseUserQuery.mockReturnValue({ data: mockUser });
    jest.clearAllMocks();
  });

  it('renders the hamburger menu trigger button', () => {
    renderSmallMenu();
    expect(getTriggerButton()).toBeInTheDocument();
  });

  it('does not show menu items before the trigger is clicked', () => {
    renderSmallMenu();
    expect(screen.queryByText(textMock('dashboard.header_item_dashboard'))).not.toBeInTheDocument();
  });

  it('shows the trigger profile text and menu items after opening the menu', async () => {
    const user = userEvent.setup();
    renderSmallMenu();

    await user.click(getTriggerButton());

    expect(screen.getByText('Test Testersen for Testdepartementet')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: textMock('top_bar.group_tools'), level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('dashboard.header_item_dashboard'))).toBeInTheDocument();
    expect(screen.getByText('Skatteetaten')).toBeInTheDocument();
  });

  it('renders an inactive button item without the active class', async () => {
    const user = userEvent.setup();
    const inactiveMenuItems: StudioProfileMenuGroup[] = [
      {
        name: textMock('top_bar.group_organizations'),
        items: [
          {
            action: { type: 'button', onClick: mockMenuAction },
            itemName: 'Skatteetaten',
            isActive: false,
          },
        ],
      },
    ];
    render(
      <MemoryRouter>
        <SmallProfileMenu
          triggerButtonText='Test Testersen for Testdepartementet'
          items={inactiveMenuItems}
        />
      </MemoryRouter>,
    );

    await user.click(getTriggerButton());

    const item = screen.getByRole('menuitem', { name: 'Skatteetaten' });
    expect(item).not.toHaveClass('active');
  });

  it('calls the button action and closes the menu when clicking a button item', async () => {
    const user = userEvent.setup();
    renderSmallMenu();

    await user.click(getTriggerButton());
    await user.click(screen.getByRole('menuitem', { name: 'Skatteetaten' }));

    expect(mockMenuAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Skatteetaten' })).not.toBeInTheDocument();
  });

  it('renders links with expected href and target attributes', async () => {
    const user = userEvent.setup();
    renderSmallMenu();

    await user.click(getTriggerButton());

    expect(
      screen.getByRole('menuitem', { name: textMock('dashboard.header_item_dashboard') }),
    ).toHaveAttribute('href', '/dashboard/app/test');
    expect(
      screen.getByRole('menuitem', { name: textMock('shared.header_go_to_gitea') }),
    ).toHaveAttribute('target', '_blank');
  });
});

function getTriggerButton() {
  return screen.getByRole('button', { name: textMock('top_menu.menu') });
}

const renderSmallMenu = () =>
  render(
    <MemoryRouter>
      <SmallProfileMenu
        triggerButtonText='Test Testersen for Testdepartementet'
        items={menuItems}
      />
    </MemoryRouter>,
  );
