import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioPageHeaderProfileMenu,
  type StudioPageHeaderProfileMenuProps,
} from './StudioPageHeaderProfileMenu';
import userEvent from '@testing-library/user-event';
import { type StudioProfileMenuItem } from './types/StudioProfileMenuItem';
import { type StudioProfileMenuGroup } from './types/StudioProfileMenuGroup';

const mockImageAlt: string = 'Alt';
const defaultProfileImage = <img src='profile.jpg' alt={mockImageAlt} />;

const menuItem1: string = 'Item1';
const menuItem2: string = 'Item2';
const menuItem3: string = 'Item3';
const menuItem4: string = 'Item4';

const menuItem2Link: string = '/a';
const menuItem3Link: string = '/b';

const mockOnClick = jest.fn();

const mockProfileMenuItems1: StudioProfileMenuItem[] = [
  {
    action: { type: 'button', onClick: mockOnClick },
    itemName: menuItem1,
    isActive: true,
  },
  {
    action: { type: 'link', href: menuItem2Link },
    itemName: menuItem2,
  },
];
const mockProfileMenuItems2: StudioProfileMenuItem[] = [
  {
    action: { type: 'link', href: menuItem3Link, openInNewTab: true },
    itemName: menuItem3,
  },
  {
    action: { type: 'button', onClick: mockOnClick },
    itemName: menuItem4,
  },
];

const mockProfileMenuGroups: StudioProfileMenuGroup[] = [
  { items: mockProfileMenuItems1 },
  { items: mockProfileMenuItems2 },
];

const mockTriggerButtonText: string = 'Trigger';

const defaultProps: StudioPageHeaderProfileMenuProps = {
  triggerButtonText: mockTriggerButtonText,
  profileImage: defaultProfileImage,
  profileMenuGroups: mockProfileMenuGroups,
};

describe('StudioProfileMenu', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  it('should render trigger button with text and image', () => {
    renderStudioProfileMenu();

    expect(screen.getByRole('button', { name: mockTriggerButtonText })).toBeInTheDocument();
    expect(screen.getByAltText(mockImageAlt)).toBeInTheDocument();
  });

  it('should open the dropdown menu when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioProfileMenu();

    const triggerButton = screen.getByRole('button', { name: mockTriggerButtonText });
    await user.click(triggerButton);

    expect(screen.getByText(menuItem1)).toBeInTheDocument();
    expect(screen.getByText(menuItem2)).toBeInTheDocument();
    expect(screen.getByText(menuItem3)).toBeInTheDocument();
  });

  it('should close the dropdown menu when a button menu item is clicked', async () => {
    const user = userEvent.setup();

    const originalClose = window.close;
    window.close = jest.fn();

    renderStudioProfileMenu();

    const triggerButton = screen.getByRole('button', { name: mockTriggerButtonText });
    await user.click(triggerButton);

    await user.click(screen.getByRole('menuitemradio', { name: menuItem1 }));

    expect(mockOnClick).toHaveBeenCalledTimes(1);
    window.close = originalClose;
  });

  it('should have correct attributes for link item without "openInNewTab" value', async () => {
    const user = userEvent.setup();
    renderStudioProfileMenu();

    const triggerButton = screen.getByRole('button', { name: mockTriggerButtonText });
    await user.click(triggerButton);

    const link = screen.getByRole('menuitem', { name: menuItem2 });
    expect(link).toHaveAttribute('href', menuItem2Link);
    expect(link).not.toHaveAttribute('target', '_blank');
    expect(link).not.toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should have correct attributes for link item with "openInNewTab" value', async () => {
    const user = userEvent.setup();
    renderStudioProfileMenu();

    const triggerButton = screen.getByRole('button', { name: mockTriggerButtonText });
    await user.click(triggerButton);

    const link = screen.getByRole('menuitem', { name: menuItem3 });
    expect(link).toHaveAttribute('href', menuItem3Link);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should close the menu when clicking a menuitem', async () => {
    const user = userEvent.setup();

    const originalClose = window.close;
    window.close = jest.fn();

    renderStudioProfileMenu();

    const triggerButton = screen.getByRole('button', { name: mockTriggerButtonText });
    await user.click(triggerButton);

    expect(screen.getByRole('menuitemradio', { name: menuItem1 })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitemradio', { name: menuItem1 }));

    expect(mockOnClick).toHaveBeenCalledTimes(1);
    window.close = originalClose;
  });

  it('should toggle the dropdown menu open and close when the trigger button is clicked multiple times', async () => {
    const user = userEvent.setup();
    renderStudioProfileMenu();

    const triggerButton = screen.getByRole('button', { name: mockTriggerButtonText });

    await user.click(triggerButton);
    expect(screen.getByRole('menuitemradio', { name: menuItem1 })).toBeInTheDocument();

    await user.click(triggerButton);
  });

  it('should close the dropdown menu when handleClose is called', async () => {
    const user = userEvent.setup();
    renderStudioProfileMenu();

    const triggerButton = screen.getByRole('button', { name: mockTriggerButtonText });
    await user.click(triggerButton);

    expect(screen.getByRole('menuitemradio', { name: menuItem1 })).toBeInTheDocument();

    await user.click(triggerButton);
  });

  it('should not close the dropdown when a link item is clicked and openInNewTab is true', async () => {
    const user = userEvent.setup();
    renderStudioProfileMenu();

    const triggerButton = screen.getByRole('button', { name: mockTriggerButtonText });
    await user.click(triggerButton);

    const link = screen.getByRole('menuitem', { name: menuItem3 });
    await user.click(link);

    expect(screen.getByRole('menuitemradio', { name: menuItem1 })).toBeInTheDocument();
  });

  it('should not set target or rel attributes if openInNewTab is false', async () => {
    const user = userEvent.setup();

    renderStudioProfileMenu();

    const triggerButton = screen.getByRole('button', { name: mockTriggerButtonText });
    await user.click(triggerButton);

    const link = screen.getByRole('menuitem', { name: menuItem2 });
    expect(link).toHaveAttribute('href', menuItem2Link);
    expect(link).not.toHaveAttribute('target', '_blank');
    expect(link).not.toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should set the aria-checked attribute correctly', async () => {
    const user = userEvent.setup();
    renderStudioProfileMenu();

    const triggerButton = screen.getByRole('button', { name: mockTriggerButtonText });
    await user.click(triggerButton);

    expect(screen.getByRole('menuitemradio', { name: menuItem1 })).toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: menuItem4 })).not.toBeChecked();
  });
});

const renderStudioProfileMenu = (
  props?: Partial<StudioPageHeaderProfileMenuProps>,
): ReturnType<typeof render> => {
  return render(<StudioPageHeaderProfileMenu {...defaultProps} {...props} />);
};
