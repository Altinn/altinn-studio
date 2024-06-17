import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessListPreconditionFailedToast } from './AccessListPreconditionFailedToast';
import { textMock } from '@studio/testing/mocks/i18nMock';

const originalWindowLocation = window.location;

describe('AccessListPreconditionFailedToast', () => {
  beforeEach(() => {
    delete window.location;
    window.location = {
      ...originalWindowLocation,
      reload: jest.fn(),
    };
  });
  afterEach(() => {
    jest.clearAllMocks();
    window.location = originalWindowLocation;
  });

  it('should refresh page when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<AccessListPreconditionFailedToast />);

    const refreshButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_list_sim_update_refresh'),
    });
    await user.click(refreshButton);

    expect(window.location.reload).toHaveBeenCalled();
  });
});
