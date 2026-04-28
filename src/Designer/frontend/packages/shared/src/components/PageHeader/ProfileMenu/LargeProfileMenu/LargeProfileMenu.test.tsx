import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LargeProfileMenu, type LargeProfileMenuProps } from './LargeProfileMenu';
import type { User } from 'app-shared/types/Repository';
import { StudioPageHeader } from '@studio/components';

const mockUseUserQuery = jest.fn();

jest.mock('app-shared/hooks/queries', () => ({
  useUserQuery: (...args: unknown[]) => mockUseUserQuery(...args),
}));

const userMock: User = {
  avatar_url: '',
  email: '',
  full_name: 'Test User',
  id: 1,
  login: 'testuser',
  userType: 0,
};

const onPrimaryAction = jest.fn();

const defaultProps: LargeProfileMenuProps = {
  triggerButtonText: 'Profile menu trigger text',
  items: [
    {
      name: 'Profile actions',
      items: [
        {
          action: { type: 'button', onClick: onPrimaryAction },
          itemName: 'Primary action',
        },
      ],
    },
    {
      items: [
        {
          action: { type: 'link', href: '/repos/testuser', openInNewTab: true },
          itemName: 'Gitea',
        },
      ],
    },
  ],
};

type RenderOptions = {
  props?: Partial<LargeProfileMenuProps>;
  user?: User | null;
};

const renderProfileMenu = (options: RenderOptions = {}) => {
  const { props = {}, user = userMock } = options;
  mockUseUserQuery.mockReturnValue({ data: user ?? undefined });
  return render(
    <MemoryRouter>
      <StudioPageHeader>
        <LargeProfileMenu {...defaultProps} {...props} />
      </StudioPageHeader>
    </MemoryRouter>,
  );
};

describe('LargeProfileMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when user data is not loaded', () => {
    renderProfileMenu({ user: null });
    expect(
      screen.queryByRole('button', { name: defaultProps.triggerButtonText }),
    ).not.toBeInTheDocument();
  });

  it('shows the provided trigger button text', () => {
    renderProfileMenu();
    expect(
      screen.getByRole('button', { name: defaultProps.triggerButtonText }),
    ).toBeInTheDocument();
  });

  it('renders menu items after opening the menu', async () => {
    const user = userEvent.setup();
    renderProfileMenu();
    await user.click(screen.getByRole('button', { name: defaultProps.triggerButtonText }));
    expect(screen.getByRole('menuitemradio', { name: 'Primary action' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Gitea' })).toHaveAttribute(
      'href',
      '/repos/testuser',
    );
  });

  it('calls button action when clicking a button menu item', async () => {
    const user = userEvent.setup();
    renderProfileMenu();
    await user.click(screen.getByRole('button', { name: defaultProps.triggerButtonText }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Primary action' }));
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });
});
