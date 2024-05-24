import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SafeErrorView, type SafeErrorViewProps } from './SafeErrorView';
import { textMock } from '../../../testing/mocks/i18nMock';

const { reload: originalReload } = window.location;

describe('SafeErrorView', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: jest.fn() },
    });
  });

  afterEach(() => {
    window.location.reload = originalReload;
  });

  it('should render heading, title and message, with a reload button', () => {
    renderSafeErrorView({
      heading: 'All users list',
      title: 'Failed to load users',
      message: 'Some unexpected happen when loading users',
    });

    expect(screen.getByRole('heading', { name: 'All users list', level: 2 })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Failed to load users', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Some unexpected happen when loading users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('general.reload') })).toBeInTheDocument();
  });

  it('should use call reload on window.location to ensure full page refresh', async () => {
    const user = userEvent.setup();

    renderSafeErrorView();

    const reloadPageButton = screen.getByRole('button', { name: textMock('general.reload') });
    await user.click(reloadPageButton);

    expect(window.location.reload).toHaveBeenCalled();
  });
});

const renderSafeErrorView = (props?: SafeErrorViewProps): void => {
  const { heading = '', title = '', message = '' } = props || {};
  render(<SafeErrorView heading={heading} title={title} message={message} />);
};
