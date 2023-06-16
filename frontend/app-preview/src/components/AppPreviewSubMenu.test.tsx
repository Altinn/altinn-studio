import React from 'react';
import { AppPreviewSubMenuProps, AppPreviewSubMenu } from './AppPreviewSubMenu';
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('AppPreviewSubMenu', () => {
  const props: AppPreviewSubMenuProps = {
    viewSize: 'desktop',
    setViewSize: jest.fn(),
    selectedLayoutSet: 'default',
    handleChangeLayoutSet: jest.fn(),
  };

  it('renders the component with desktop viewSize', () => {
    render(<AppPreviewSubMenu {...props} />);
    const desktopButton = screen.getByRole('button', { name: 'preview.view_size_desktop' });
    const mobileButton = screen.getByRole('button', { name: 'preview.view_size_mobile' });
    expect(desktopButton).toHaveAttribute('aria-pressed', 'true');
    expect(mobileButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders the component with mobile viewSize', () => {
    render(<AppPreviewSubMenu {...props} viewSize='mobile' />);
    const desktopButton = screen.getByRole('button', { name: 'preview.view_size_desktop' });
    const mobileButton = screen.getByRole('button', { name: 'preview.view_size_mobile' });
    expect(desktopButton).toHaveAttribute('aria-pressed', 'false');
    expect(mobileButton).toHaveAttribute('aria-pressed', 'true');
  });
});
