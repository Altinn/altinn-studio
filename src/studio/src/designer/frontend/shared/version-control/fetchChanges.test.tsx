import React from 'react';
import FetchChangesComponenet from './fetchChanges';
import type { IFetchChangesComponentProps } from './fetchChanges';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

describe('fetchChanges', () => {
  it('should call fetchChanges when clicking sync button', async () => {
    const handleFetchChanges = jest.fn();
    render({ fetchChanges: handleFetchChanges });

    const syncButton = screen.getByRole('button', {
      name: /sync_header\.fetch_changes/i,
    });

    await user.click(syncButton);

    expect(handleFetchChanges).toHaveBeenCalled();
  });
});

const render = (props: Partial<IFetchChangesComponentProps> = {}) => {
  const allProps = {
    changesInMaster: true,
    classes: {},
    fetchChanges: jest.fn(),
    language: {},
    ...props,
  };

  return rtlRender(<FetchChangesComponenet {...allProps} />);
};
