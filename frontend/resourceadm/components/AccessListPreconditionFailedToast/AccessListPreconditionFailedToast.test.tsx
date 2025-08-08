import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessListPreconditionFailedToast } from './AccessListPreconditionFailedToast';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('AccessListPreconditionFailedToast', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should refresh page when refresh button is clicked', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: jest.fn() },
    });
    const user = userEvent.setup();
    render(<AccessListPreconditionFailedToast />);

    const refreshButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_list_sim_update_refresh'),
    });
    await user.click(refreshButton);

    expect(window.location.reload).toHaveBeenCalled();
  });
});
