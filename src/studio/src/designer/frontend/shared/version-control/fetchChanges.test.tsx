import React from 'react';
import { FetchChangesComponent } from './fetchChanges';
import type { IFetchChangesComponentProps } from './fetchChanges';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

describe('fetchChanges', () => {
  it('should call fetchChanges when clicking sync button', async () => {
    const handleFetchChanges = jest.fn();
    render({ fetchChanges: handleFetchChanges });
    const syncButton = screen.getByTestId('fetch-changes-button');
    await user.click(syncButton);
    expect(handleFetchChanges).toHaveBeenCalled();
  });
});

const render = (props: Partial<IFetchChangesComponentProps> = {}) => {
  const allProps = {
    changesInMaster: true,
    fetchChanges: jest.fn(),
    buttonText: 'pull',
    ...props,
  };
  return rtlRender(<FetchChangesComponent {...allProps} />);
};
